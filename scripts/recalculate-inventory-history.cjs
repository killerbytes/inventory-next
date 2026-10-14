#!/usr/bin/env node
/**
 * Historical Inventory Recalculation & Parity Audit Script
 *
 * Replays inventory movements chronologically (GR -> BreakPack -> RePack -> Sales)
 * using the verified Moving Weighted Average Cost (WAC) formula.
 *
 * Usage:
 *   node scripts/recalculate-inventory-history.cjs [--dry-run] [--apply] [--product=<id>] [--limit=<n>] [--verbose]
 *
 * Default is --dry-run (non-destructive audit).
 */

const path = require("path");
const { Client } = require("pg");

// Parse arguments
const args = process.argv.slice(2);
const isApply = args.includes("--apply");
const isDryRun = !isApply || args.includes("--dry-run");
const isVerbose = args.includes("--verbose");
const productArg = args.find((a) => a.startsWith("--product="));
const limitArg = args.find((a) => a.startsWith("--limit="));

const targetProductId = productArg ? parseInt(productArg.split("=")[1], 10) : null;
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

const client = new Client({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "killer",
  database: process.env.DB_NAME || "inventory_db",
  port: parseInt(process.env.DB_PORT || "5432", 10),
});

function truncateQty(num, places = 4) {
  if (num === null || num === undefined || isNaN(Number(num))) return 0;
  const factor = Math.pow(10, places);
  return Math.round((Number(num) + Number.EPSILON) * factor) / factor;
}

function calculateMovingAverageCost({ existingQuantity, existingAveragePrice, incomingQuantity, incomingUnitCost }) {
  const existingQty = Number(existingQuantity || 0);
  const existingPrice = Number(existingAveragePrice || 0);
  const incomingQty = Number(incomingQuantity || 0);
  const incomingCost = Number(incomingUnitCost || 0);

  if (incomingQty <= 0) return existingPrice;
  if (existingQty <= 0) return truncateQty(incomingCost);

  const totalQty = existingQty + incomingQty;
  const totalValue = existingQty * existingPrice + incomingQty * incomingCost;
  return truncateQty(totalValue / totalQty);
}

async function simulateProduct(productId) {
  // 1. Fetch combinations
  const combsRes = await client.query(
    `SELECT pc.id, pc.sku, pc.unit, pc."conversionFactor", pc."isBreakPackOfId", 
            COALESCE(inv."averagePrice", '0') as "dbAveragePrice",
            COALESCE(inv.quantity, '0') as "dbQuantity"
     FROM "ProductCombinations" pc
     LEFT JOIN "Inventories" inv ON inv."combinationId" = pc.id
     WHERE pc."productId" = $1
     ORDER BY pc.id ASC`,
    [productId],
  );

  if (combsRes.rows.length === 0) return null;

  const combinations = combsRes.rows.map((r) => ({
    id: r.id,
    sku: r.sku,
    unit: r.unit,
    conversionFactor: Number(r.conversionFactor || 1),
    isBreakPackOfId: r.isBreakPackOfId ? Number(r.isBreakPackOfId) : null,
    dbAveragePrice: Number(r.dbAveragePrice || 0),
    dbQuantity: Number(r.dbQuantity || 0),
  }));

  const comboIds = combinations.map((c) => c.id);

  // 2. Fetch Good Receipt Lines (strictly non-deleted and non-VOID)
  const grRes = await client.query(
    `SELECT grl.id, grl."combinationId", grl.quantity, grl."purchasePrice", grl.discount, grl."createdAt"
     FROM "GoodReceiptLines" grl
     INNER JOIN "GoodReceipts" gr ON gr.id = grl."goodReceiptId"
     WHERE grl."combinationId" = ANY($1)
       AND grl."deletedAt" IS NULL
       AND gr."deletedAt" IS NULL
       AND gr.status != 'VOID'
     ORDER BY grl."createdAt" ASC, grl.id ASC`,
    [comboIds],
  );

  // 3. Fetch BreakPacks & RePacks with exact historical in/out quantities
  const bpRes = await client.query(
    `SELECT bp.id, bp."fromCombinationId", bp."toCombinationId", bp.quantity, bp."conversionFactor", bp.type, bp."createdAt",
            ABS(COALESCE(m_out.quantity, bp.quantity)) as "sourceQty",
            ABS(COALESCE(m_in.quantity, 0)) as "targetQty"
     FROM "BreakPacks" bp
     LEFT JOIN "InventoryMovements" m_out ON m_out."referenceId" = bp.id AND m_out."referenceType" = 'BREAK_PACK' AND m_out.quantity < 0
     LEFT JOIN "InventoryMovements" m_in ON m_in."referenceId" = bp.id AND m_in."referenceType" = 'BREAK_PACK' AND m_in.quantity > 0
     WHERE bp."fromCombinationId" = ANY($1) OR bp."toCombinationId" = ANY($1)
     ORDER BY bp."createdAt" ASC, bp.id ASC`,
    [comboIds],
  );

  // 4. Fetch Sales Order Movements from InventoryMovements
  const somRes = await client.query(
    `SELECT im.id, im."combinationId", im.quantity, im."costPerUnit", im."createdAt"
     FROM "InventoryMovements" im
     WHERE im."combinationId" = ANY($1) AND im."referenceType" = 'SALES_ORDER'
     ORDER BY im."createdAt" ASC, im.id ASC`,
    [comboIds],
  );

  // 5. Fetch Stock Adjustments
  const saRes = await client.query(
    `SELECT sa.id, sa."combinationId", sa.difference, sa."createdAt"
     FROM "StockAdjustments" sa
     WHERE sa."combinationId" = ANY($1)
     ORDER BY sa."createdAt" ASC, sa.id ASC`,
    [comboIds],
  );

  // 6. Fetch Legacy BreakPack/RePack movements from InventoryMovements (not linked to BreakPacks table)
  const legacyBpRes = await client.query(
    `SELECT im.id, im.type, im.quantity, im."costPerUnit", im."combinationId", im."createdAt"
     FROM "InventoryMovements" im
     WHERE im."combinationId" = ANY($1) 
       AND im."referenceType" = 'BREAK_PACK'
       AND NOT EXISTS (SELECT 1 FROM "BreakPacks" bp WHERE bp.id = im."referenceId")
     ORDER BY im."createdAt" ASC, im.id ASC`,
    [comboIds],
  );

  // 7. Fetch Return movements from InventoryMovements (SUPPLIER_RETURN_OUT and RETURN_IN)
  const returnRes = await client.query(
    `SELECT im.id, im.type, im.quantity, im."costPerUnit", im."combinationId", im."createdAt"
     FROM "InventoryMovements" im
     WHERE im."combinationId" = ANY($1) 
       AND im.type IN ('SUPPLIER_RETURN_OUT', 'RETURN_IN')
     ORDER BY im."createdAt" ASC, im.id ASC`,
    [comboIds],
  );

  // Combine into a single chronological timeline
  const events = [];

  for (const gr of grRes.rows) {
    const qty = Number(gr.quantity || 0);
    const unitPrice = Number(gr.purchasePrice || 0);
    const discount = Number(gr.discount || 0);
    const netCost = qty > 0 ? (qty * unitPrice - discount) / qty : unitPrice;

    events.push({
      id: gr.id,
      type: "GOOD_RECEIPT",
      createdAt: new Date(gr.createdAt || 0),
      combinationId: gr.combinationId,
      quantity: qty,
      unitCost: netCost,
    });
  }

  for (const bp of bpRes.rows) {
    events.push({
      id: bp.id,
      type: bp.type || "BREAK_PACK",
      createdAt: new Date(bp.createdAt || 0),
      fromCombinationId: bp.fromCombinationId,
      toCombinationId: bp.toCombinationId,
      quantity: Number(bp.quantity || 0),
      sourceQuantity: Number(bp.sourceQty || bp.quantity || 0),
      targetQuantity: Number(bp.targetQty || 0),
      conversionFactor: Number(bp.conversionFactor || 1),
    });
  }

  for (const som of somRes.rows) {
    const moveQty = Math.abs(Number(som.quantity || 0));
    events.push({
      id: som.id,
      movementId: som.id,
      type: "SALES_ORDER",
      createdAt: new Date(som.createdAt || 0),
      combinationId: som.combinationId,
      quantity: moveQty,
      recordedCostPrice: Number(som.costPerUnit || 0),
      salesOrderItemId: som.id,
    });
  }

  for (const sa of saRes.rows) {
    events.push({
      id: sa.id,
      type: "STOCK_ADJUSTMENT",
      createdAt: new Date(sa.createdAt || 0),
      combinationId: sa.combinationId,
      quantity: Number(sa.difference || 0),
    });
  }

  for (const lbp of legacyBpRes.rows) {
    const qty = Math.abs(Number(lbp.quantity || 0));
    const cost = Number(lbp.costPerUnit || 0);
    if (lbp.type === "BREAK_PACK_IN" || lbp.type === "RE_PACK_IN") {
      events.push({
        id: lbp.id,
        type: "GOOD_RECEIPT",
        createdAt: new Date(lbp.createdAt || 0),
        combinationId: lbp.combinationId,
        quantity: qty,
        unitCost: cost,
      });
    } else {
      events.push({
        id: lbp.id,
        type: "SALES_ORDER",
        createdAt: new Date(lbp.createdAt || 0),
        combinationId: lbp.combinationId,
        quantity: qty,
        recordedCostPrice: cost,
      });
    }
  }

  for (const rm of returnRes.rows) {
    const qty = Math.abs(Number(rm.quantity || 0));
    const cost = Number(rm.costPerUnit || 0);
    if (rm.type === "SUPPLIER_RETURN_OUT") {
      events.push({
        id: rm.id,
        type: "SUPPLIER_RETURN",
        createdAt: new Date(rm.createdAt || 0),
        combinationId: rm.combinationId,
        quantity: qty,
        unitCost: cost,
      });
    } else if (rm.type === "RETURN_IN") {
      events.push({
        id: rm.id,
        type: "RETURN",
        createdAt: new Date(rm.createdAt || 0),
        combinationId: rm.combinationId,
        quantity: qty,
        unitCost: cost,
      });
    }
  }

  events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id);

  // In-memory simulation
  const stateMap = new Map();
  for (const c of combinations) {
    stateMap.set(c.id, {
      combinationId: c.id,
      quantity: 0,
      averagePrice: 0,
      totalCost: 0,
    });
  }

  const salesOrderUpdates = [];

  for (const ev of events) {
    if (ev.type === "GOOD_RECEIPT") {
      const state = stateMap.get(ev.combinationId);
      if (!state) continue;

      const newAvg = calculateMovingAverageCost({
        existingQuantity: state.quantity,
        existingAveragePrice: state.averagePrice,
        incomingQuantity: ev.quantity,
        incomingUnitCost: ev.unitCost,
      });

      state.quantity = truncateQty(state.quantity + ev.quantity);
      state.averagePrice = newAvg;
      state.totalCost = truncateQty(state.quantity * state.averagePrice);
    } else if (ev.type === "BREAK_PACK") {
      const from = stateMap.get(ev.fromCombinationId);
      const to = stateMap.get(ev.toCombinationId);
      if (!from || !to) continue;

      const sourceQty = ev.sourceQuantity || ev.quantity;
      const targetQty = ev.targetQuantity > 0 ? ev.targetQuantity : truncateQty(sourceQty * (ev.conversionFactor || 1));

      const totalCostTransferred = from.averagePrice * sourceQty;
      const batchUnitCost = targetQty > 0 ? truncateQty(totalCostTransferred / targetQty) : 0;

      const newTargetAvg = calculateMovingAverageCost({
        existingQuantity: to.quantity,
        existingAveragePrice: to.averagePrice,
        incomingQuantity: targetQty,
        incomingUnitCost: batchUnitCost,
      });

      from.quantity = truncateQty(Math.max(0, from.quantity - sourceQty));
      from.totalCost = truncateQty(from.quantity * from.averagePrice);

      to.quantity = truncateQty(to.quantity + targetQty);
      to.averagePrice = newTargetAvg;
      to.totalCost = truncateQty(to.quantity * to.averagePrice);
    } else if (ev.type === "RE_PACK") {
      const from = stateMap.get(ev.fromCombinationId);
      const to = stateMap.get(ev.toCombinationId);
      if (!from || !to) continue;

      const toComb = combinations.find((c) => c.id === ev.toCombinationId);
      const factor = toComb?.conversionFactor || ev.conversionFactor || 1;
      const sourceQty = ev.sourceQuantity || ev.quantity;
      const targetQty = ev.targetQuantity > 0 ? ev.targetQuantity : truncateQty(sourceQty / factor);

      const totalCostTransferred = from.averagePrice * sourceQty;
      const batchUnitCost = targetQty > 0 ? truncateQty(totalCostTransferred / targetQty) : 0;

      const newTargetAvg = calculateMovingAverageCost({
        existingQuantity: to.quantity,
        existingAveragePrice: to.averagePrice,
        incomingQuantity: targetQty,
        incomingUnitCost: batchUnitCost,
      });

      from.quantity = truncateQty(Math.max(0, from.quantity - sourceQty));
      from.totalCost = truncateQty(from.quantity * from.averagePrice);

      to.quantity = truncateQty(to.quantity + targetQty);
      to.averagePrice = newTargetAvg;
      to.totalCost = truncateQty(to.quantity * to.averagePrice);
    } else if (ev.type === "SALES_ORDER") {
      const state = stateMap.get(ev.combinationId);
      if (!state) continue;

      const currentWac = state.averagePrice;
      const recordedCost = ev.recordedCostPrice;
      const costDiff = truncateQty(currentWac - recordedCost);
      const profitImpact = truncateQty((recordedCost - currentWac) * ev.quantity);

      salesOrderUpdates.push({
        salesOrderItemId: ev.salesOrderItemId,
        combinationId: ev.combinationId,
        originalCostPrice: recordedCost,
        recalculatedCostPrice: currentWac,
        quantity: ev.quantity,
        costDifference: costDiff,
        profitImpact,
      });

      state.quantity = truncateQty(Math.max(0, state.quantity - ev.quantity));
      state.totalCost = truncateQty(state.quantity * state.averagePrice);
    } else if (ev.type === "STOCK_ADJUSTMENT") {
      const state = stateMap.get(ev.combinationId);
      if (!state) continue;

      const qty = Number(ev.quantity || 0);
      if (qty > 0) {
        const unitCost = Number(ev.unitCost ?? state.averagePrice);
        const newAvg = calculateMovingAverageCost({
          existingQuantity: state.quantity,
          existingAveragePrice: state.averagePrice,
          incomingQuantity: qty,
          incomingUnitCost: unitCost,
        });
        state.quantity = truncateQty(state.quantity + qty);
        state.averagePrice = newAvg;
      } else {
        state.quantity = truncateQty(Math.max(0, state.quantity + qty));
      }
      state.totalCost = truncateQty(state.quantity * state.averagePrice);
    } else if (ev.type === "SUPPLIER_RETURN") {
      const state = stateMap.get(ev.combinationId);
      if (!state) continue;

      const returnQty = Number(ev.quantity || 0);
      const returnUnitCost = Number(ev.unitCost ?? state.averagePrice);
      const remainingQty = truncateQty(Math.max(0, state.quantity - returnQty));

      if (remainingQty > 0) {
        const existingValuation = state.quantity * state.averagePrice;
        const returnValuation = returnQty * returnUnitCost;
        const remainingValuation = Math.max(0, existingValuation - returnValuation);
        state.averagePrice = truncateQty(remainingValuation / remainingQty);
      } else {
        state.averagePrice = 0;
      }
      state.quantity = remainingQty;
      state.totalCost = truncateQty(state.quantity * state.averagePrice);
    } else if (ev.type === "RETURN") {
      const state = stateMap.get(ev.combinationId);
      if (!state) continue;

      const qty = Number(ev.quantity || 0);
      const unitCost = Number(ev.unitCost ?? state.averagePrice);

      const newAvg = calculateMovingAverageCost({
        existingQuantity: state.quantity,
        existingAveragePrice: state.averagePrice,
        incomingQuantity: qty,
        incomingUnitCost: unitCost,
      });

      state.quantity = truncateQty(state.quantity + qty);
      state.averagePrice = newAvg;
      state.totalCost = truncateQty(state.quantity * state.averagePrice);
    }
  }

  // Compare drifts (Cost-Only Policy: Valuation and Average Price Parity)
  const combinationDrifts = [];
  for (const c of combinations) {
    const sim = stateMap.get(c.id);
    const diff = truncateQty(sim.averagePrice - c.dbAveragePrice);
    if (Math.abs(diff) > 0.0001) {
      combinationDrifts.push({
        combinationId: c.id,
        sku: c.sku,
        unit: c.unit,
        dbAveragePrice: c.dbAveragePrice,
        recalculatedAveragePrice: sim.averagePrice,
        diff,
        dbQuantity: c.dbQuantity,
        recalculatedQuantity: sim.quantity,
      });
    }
  }

  const salesOrderDrifts = salesOrderUpdates.filter((so) => Math.abs(so.costDifference) > 0.0001);
  const totalProfitImpact = salesOrderDrifts.reduce((acc, so) => acc + so.profitImpact, 0);

  return {
    productId,
    hasDrift: combinationDrifts.length > 0 || salesOrderDrifts.length > 0,
    combinations,
    simulatedCombinations: stateMap,
    combinationDrifts,
    salesOrderDrifts,
    salesOrderUpdates,
    totalProfitImpact: truncateQty(totalProfitImpact),
  };
}

async function main() {
  await client.connect();

  console.log("================================================================================");
  console.log("             HISTORICAL INVENTORY RECALCULATION & PARITY ENGINE                 ");
  console.log("================================================================================");
  console.log(`Mode:    ${isApply ? ">>> APPLY CHANGES (TRANSACTION COMMIT) <<<" : "DRY-RUN AUDIT ONLY (NO CHANGES WRITTEN)"}`);
  if (targetProductId) console.log(`Target:  Product #${targetProductId}`);
  console.log("--------------------------------------------------------------------------------\n");

  let query = 'SELECT id, name FROM "Products"';
  const queryParams = [];

  if (targetProductId) {
    query += " WHERE id = $1";
    queryParams.push(targetProductId);
  } else {
    query += ' ORDER BY id ASC';
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
  }

  const productsRes = await client.query(query, queryParams);
  const products = productsRes.rows;

  console.log(`Scanning ${products.length} product(s)...\n`);

  let driftedProductCount = 0;
  let totalCombDriftCount = 0;
  let totalSoDriftCount = 0;
  let netGrossProfitAdjustment = 0;

  for (const prod of products) {
    const sim = await simulateProduct(prod.id);
    if (!sim) continue;

    if (sim.hasDrift) {
      driftedProductCount++;
      totalCombDriftCount += sim.combinationDrifts.length;
      totalSoDriftCount += sim.salesOrderDrifts.length;
      netGrossProfitAdjustment += sim.totalProfitImpact;

      console.log(`[Product #${prod.id}: ${prod.name}] DRIFT DETECTED:`);
      if (sim.combinationDrifts.length > 0) {
        console.log(`  Combination Price Mismatches (${sim.combinationDrifts.length}):`);
        sim.combinationDrifts.forEach((cd) => {
          console.log(`    - Comb #${cd.combinationId} (${cd.sku} [${cd.unit}]): DB Avg=₱${cd.dbAveragePrice} -> Recalc=₱${cd.recalculatedAveragePrice} (Diff: ${cd.diff > 0 ? "+" : ""}${cd.diff}) | Current On-Hand Stock: ${cd.dbQuantity} (IMMUTABLE)`);
        });
      }
      if (sim.salesOrderDrifts.length > 0) {
        console.log(`  Sales Orders Cost Price Drifts: ${sim.salesOrderDrifts.length} items (Net Profit Impact: ₱${sim.totalProfitImpact.toFixed(2)})`);
        if (isVerbose) {
          sim.salesOrderDrifts.forEach((sod) => {
            console.log(`    - SOI #${sod.salesOrderItemId}: DB Cost=₱${sod.originalCostPrice} -> Recalc=₱${sod.recalculatedCostPrice} (Diff: ${sod.costDifference > 0 ? "+" : ""}${sod.costDifference})`);
          });
        }
      }

      // If --apply mode is active, execute transaction write
      if (isApply) {
        await client.query("BEGIN");
        try {
          // Update Inventories (COST-ONLY IMMUTABILITY: Never overwrite physical on-hand quantity)
          for (const [combId, state] of sim.simulatedCombinations.entries()) {
            await client.query(
              `UPDATE "Inventories" 
               SET "averagePrice" = $1, "updatedAt" = NOW() 
               WHERE "combinationId" = $2`,
              [String(state.averagePrice), combId],
            );
          }

          // Update InventoryMovements (Sales Order OUT costs)
          for (const so of sim.salesOrderUpdates) {
            if (Math.abs(so.costDifference) > 0.0001) {
              await client.query(
                `UPDATE "InventoryMovements" 
                 SET "costPerUnit" = $1, "totalCost" = $2 
                 WHERE id = $3`,
                [String(so.recalculatedCostPrice), String(-1 * so.quantity * so.recalculatedCostPrice), so.salesOrderItemId],
              );
            }
          }

          await client.query("COMMIT");
          console.log(`  >>> Successfully applied corrections for Product #${prod.id} <<<\n`);
        } catch (err) {
          await client.query("ROLLBACK");
          console.error(`  ERROR applying Product #${prod.id}:`, err.message);
        }
      } else {
        console.log("");
      }
    }
  }

  console.log("================================================================================");
  console.log("                               SUMMARY AUDIT REPORT                             ");
  console.log("================================================================================");
  console.log(`Total Products Scanned:           ${products.length}`);
  console.log(`Products With Valuation Drift:    ${driftedProductCount}`);
  console.log(`Total Combination Drifts:         ${totalCombDriftCount}`);
  console.log(`Total Sales Order Item Drifts:    ${totalSoDriftCount}`);
  console.log(`Net Historical Profit Impact:     ₱${netGrossProfitAdjustment.toFixed(2)}`);
  console.log("================================================================================");

  if (isDryRun && driftedProductCount > 0) {
    console.log("\n[TIP] Upang i-apply ang mga updates sa database, patakbuhin gamit ang flag na:");
    if (targetProductId) {
      console.log(`  node scripts/recalculate-inventory-history.cjs --apply --product=${targetProductId}\n`);
    } else {
      console.log(`  node scripts/recalculate-inventory-history.cjs --apply\n`);
    }
  }

  await client.end();
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
