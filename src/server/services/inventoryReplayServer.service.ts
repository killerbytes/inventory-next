import { truncateQty } from "@/lib/compute";
import { calculateMovingAverageCost } from "./inventoryServer.service";
import { db } from "@/server/db/drizzle";
import {
  inventories,
  inventoryMovements,
  productCombinations,
  salesOrderItems,
  goodReceiptLines,
  goodReceipts,
  breakPacks,
  stockAdjustments,
} from "@/server/db/schema";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";

export interface ReplayCombinationInitialState {
  id: number;
  sku: string;
  unit: string;
  conversionFactor: number;
  isBreakPackOfId: number | null;
}

export interface ReplayTimelineEvent {
  id: number;
  type: "GOOD_RECEIPT" | "BREAK_PACK" | "RE_PACK" | "SALES_ORDER" | "STOCK_ADJUSTMENT" | "RETURN" | "SUPPLIER_RETURN";
  createdAt: Date;
  movementId?: number;
  combinationId?: number;
  quantity?: number;
  unitCost?: number;
  sellingPrice?: number;
  recordedCostPrice?: number;
  salesOrderItemId?: number;
  fromCombinationId?: number;
  toCombinationId?: number;
  conversionFactor?: number;
  isDeleted?: boolean;
  status?: string;
}

export interface SimulatedCombinationState {
  combinationId: number;
  quantity: number;
  averagePrice: number;
  totalCost: number;
}

export interface SalesOrderUpdatePlan {
  salesOrderItemId: number;
  combinationId: number;
  originalCostPrice: number;
  recalculatedCostPrice: number;
  quantity: number;
  costDifference: number;
  profitImpact: number;
}

export interface MovementUpdatePlan {
  movementId: number;
  combinationId: number;
  recalculatedCostPerUnit: number;
  recalculatedTotalCost: number;
}

export interface SimulationResult {
  combinations: Map<number, SimulatedCombinationState>;
  salesOrderUpdates: SalesOrderUpdatePlan[];
  movementUpdates: MovementUpdatePlan[];
}

export interface ProductReplayDiff {
  productId: number;
  hasDrift: boolean;
  combinationDrifts: Array<{
    combinationId: number;
    dbAveragePrice: number;
    recalculatedAveragePrice: number;
    diff: number;
    dbQuantity: number;
    recalculatedQuantity: number;
    targetQuantity?: number;
  }>;
  salesOrderDrifts: Array<{
    salesOrderItemId: number;
    combinationId: number;
    dbCostPrice: number;
    recalculatedCostPrice: number;
    costDifference: number;
    profitImpact: number;
  }>;
  totalProfitImpact: number;
}

/**
 * Pure simulation engine that processes an in-memory chronological timeline for a product.
 */
export function simulateProductTimeline(
  combinations: ReplayCombinationInitialState[],
  events: ReplayTimelineEvent[],
): SimulationResult {
  const combinationMap = new Map<number, SimulatedCombinationState>();
  const combMetaMap = new Map<number, ReplayCombinationInitialState>();

  for (const c of combinations) {
    combinationMap.set(c.id, {
      combinationId: c.id,
      quantity: 0,
      averagePrice: 0,
      totalCost: 0,
    });
    combMetaMap.set(c.id, c);
  }

  // Sort events chronologically
  const sortedEvents = [...events].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id,
  );

  const salesOrderUpdates: SalesOrderUpdatePlan[] = [];
  const movementUpdates: MovementUpdatePlan[] = [];

  for (const event of sortedEvents) {
    if (event.isDeleted || event.status === "VOID") continue;

    if (event.type === "GOOD_RECEIPT") {
      if (!event.combinationId) continue;
      const state = combinationMap.get(event.combinationId);
      if (!state) continue;

      const qty = Number(event.quantity || 0);
      const unitCost = Number(event.unitCost || 0);

      const newAvg = calculateMovingAverageCost({
        existingQuantity: state.quantity,
        existingAveragePrice: state.averagePrice,
        incomingQuantity: qty,
        incomingUnitCost: unitCost,
      });

      state.quantity = truncateQty(state.quantity + qty);
      state.averagePrice = newAvg;
      state.totalCost = truncateQty(state.quantity * state.averagePrice);

      if (event.movementId) {
        movementUpdates.push({
          movementId: event.movementId,
          combinationId: event.combinationId,
          recalculatedCostPerUnit: state.averagePrice,
          recalculatedTotalCost: truncateQty(qty * unitCost),
        });
      }
    } else if (event.type === "BREAK_PACK") {
      if (!event.fromCombinationId || !event.toCombinationId) continue;
      const fromState = combinationMap.get(event.fromCombinationId);
      const toState = combinationMap.get(event.toCombinationId);
      if (!fromState || !toState) continue;

      const numQty = Number(event.quantity || 0);
      const fromFactor = Number(event.conversionFactor || 1);
      const targetQty = truncateQty(numQty * fromFactor);

      const fromAvgPrice = fromState.averagePrice;
      const totalCostTransferred = fromAvgPrice * numQty;
      const batchUnitCost =
        targetQty > 0 ? truncateQty(totalCostTransferred / targetQty) : 0;

      const newTargetAvg = calculateMovingAverageCost({
        existingQuantity: toState.quantity,
        existingAveragePrice: toState.averagePrice,
        incomingQuantity: targetQty,
        incomingUnitCost: batchUnitCost,
      });

      fromState.quantity = truncateQty(Math.max(0, fromState.quantity - numQty));
      fromState.totalCost = truncateQty(fromState.quantity * fromState.averagePrice);

      toState.quantity = truncateQty(toState.quantity + targetQty);
      toState.averagePrice = newTargetAvg;
      toState.totalCost = truncateQty(toState.quantity * toState.averagePrice);

      if (event.movementId) {
        movementUpdates.push({
          movementId: event.movementId,
          combinationId: event.toCombinationId,
          recalculatedCostPerUnit: batchUnitCost,
          recalculatedTotalCost: truncateQty(totalCostTransferred),
        });
      }
    } else if (event.type === "RE_PACK") {
      if (!event.fromCombinationId || !event.toCombinationId) continue;
      const fromState = combinationMap.get(event.fromCombinationId);
      const toState = combinationMap.get(event.toCombinationId);
      const toMeta = combMetaMap.get(event.toCombinationId);
      if (!fromState || !toState) continue;

      const numQty = Number(event.quantity || 0);
      const toFactor = Number(toMeta?.conversionFactor || event.conversionFactor || 1);
      const targetQty = truncateQty(numQty / toFactor);

      const fromAvgPrice = fromState.averagePrice;
      const totalCostTransferred = fromAvgPrice * numQty;
      const batchUnitCost =
        targetQty > 0 ? truncateQty(totalCostTransferred / targetQty) : 0;

      const newTargetAvg = calculateMovingAverageCost({
        existingQuantity: toState.quantity,
        existingAveragePrice: toState.averagePrice,
        incomingQuantity: targetQty,
        incomingUnitCost: batchUnitCost,
      });

      fromState.quantity = truncateQty(Math.max(0, fromState.quantity - numQty));
      fromState.totalCost = truncateQty(fromState.quantity * fromState.averagePrice);

      toState.quantity = truncateQty(toState.quantity + targetQty);
      toState.averagePrice = newTargetAvg;
      toState.totalCost = truncateQty(toState.quantity * toState.averagePrice);

      if (event.movementId) {
        movementUpdates.push({
          movementId: event.movementId,
          combinationId: event.toCombinationId,
          recalculatedCostPerUnit: batchUnitCost,
          recalculatedTotalCost: truncateQty(totalCostTransferred),
        });
      }
    } else if (event.type === "SALES_ORDER") {
      if (!event.combinationId) continue;
      const state = combinationMap.get(event.combinationId);
      if (!state) continue;

      const qty = Number(event.quantity || 0);
      const currentWac = state.averagePrice;
      const recordedCost = Number(event.recordedCostPrice || 0);

      if (event.salesOrderItemId) {
        const costDiff = truncateQty(currentWac - recordedCost);
        // Profit = Revenue - COGS. If COGS rises by diff, profit decreases by (diff * qty).
        const profitImpact = truncateQty((recordedCost - currentWac) * qty);

        salesOrderUpdates.push({
          salesOrderItemId: event.salesOrderItemId,
          combinationId: event.combinationId,
          originalCostPrice: recordedCost,
          recalculatedCostPrice: currentWac,
          quantity: qty,
          costDifference: costDiff,
          profitImpact,
        });
      }

      state.quantity = truncateQty(Math.max(0, state.quantity - qty));
      state.totalCost = truncateQty(state.quantity * state.averagePrice);
    } else if (event.type === "STOCK_ADJUSTMENT") {
      if (!event.combinationId) continue;
      const state = combinationMap.get(event.combinationId);
      if (!state) continue;

      const qty = Number(event.quantity || 0);
      if (qty > 0) {
        const unitCost = Number(event.unitCost ?? state.averagePrice);
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
    } else if (event.type === "SUPPLIER_RETURN") {
      if (!event.combinationId) continue;
      const state = combinationMap.get(event.combinationId);
      if (!state) continue;

      const returnQty = Number(event.quantity || 0);
      const returnUnitCost = Number(event.unitCost ?? state.averagePrice);
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
    } else if (event.type === "RETURN") {
      if (!event.combinationId) continue;
      const state = combinationMap.get(event.combinationId);
      if (!state) continue;

      const qty = Number(event.quantity || 0);
      const unitCost = Number(event.unitCost ?? state.averagePrice);

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

  return {
    combinations: combinationMap,
    salesOrderUpdates,
    movementUpdates,
  };
}

export function generateProductReplayDiff(
  currentDbState: {
    productId: number;
    combinations: Array<{ combinationId: number; dbAveragePrice: number; dbQuantity: number }>;
    salesOrderItems: Array<{ id: number; combinationId: number; dbCostPrice: number; quantity: number; price?: number }>;
  },
  simulatedResult: SimulationResult,
  options: { costOnly?: boolean } = { costOnly: true },
): ProductReplayDiff {
  const costOnly = options.costOnly ?? true;
  const combinationDrifts: ProductReplayDiff["combinationDrifts"] = [];
  const salesOrderDrifts: ProductReplayDiff["salesOrderDrifts"] = [];
  let totalProfitImpact = 0;

  for (const c of currentDbState.combinations) {
    const sim = simulatedResult.combinations.get(c.combinationId);
    if (!sim) continue;

    const diff = truncateQty(sim.averagePrice - c.dbAveragePrice);
    const qtyDiff = truncateQty(sim.quantity - c.dbQuantity);
    const hasPriceDrift = Math.abs(diff) > 0.0001;
    const hasQtyDrift = !costOnly && Math.abs(qtyDiff) > 0.0001;

    if (hasPriceDrift || hasQtyDrift) {
      combinationDrifts.push({
        combinationId: c.combinationId,
        dbAveragePrice: c.dbAveragePrice,
        recalculatedAveragePrice: sim.averagePrice,
        diff,
        dbQuantity: c.dbQuantity,
        recalculatedQuantity: sim.quantity,
        targetQuantity: costOnly ? c.dbQuantity : sim.quantity,
      });
    }
  }

  for (const so of simulatedResult.salesOrderUpdates) {
    if (Math.abs(so.costDifference) > 0.0001) {
      salesOrderDrifts.push({
        salesOrderItemId: so.salesOrderItemId,
        combinationId: so.combinationId,
        dbCostPrice: so.originalCostPrice,
        recalculatedCostPrice: so.recalculatedCostPrice,
        costDifference: so.costDifference,
        profitImpact: so.profitImpact,
      });
      totalProfitImpact += so.profitImpact;
    }
  }

  return {
    productId: currentDbState.productId,
    hasDrift: combinationDrifts.length > 0 || salesOrderDrifts.length > 0,
    combinationDrifts,
    salesOrderDrifts,
    totalProfitImpact: truncateQty(totalProfitImpact),
  };
}

/**
 * Server Service for executing chronological replay across one or all products.
 */
export const inventoryReplayServerService = {
  /**
   * Fetches full chronological events for a specific product from DB.
   */
  fetchProductTimelineData: async (productId: number, tx: any = db) => {
    const combos = await tx.query.productCombinations.findMany({
      where: (tbl: any, { eq }: any) => eq(tbl.productId, productId),
      with: {
        inventory: true,
      },
    });

    if (combos.length === 0) return null;

    const comboIds = combos.map((c: any) => c.id);

    // Initial combination states
    const combinationsMeta: ReplayCombinationInitialState[] = combos.map((c: any) => ({
      id: c.id,
      sku: c.sku,
      unit: c.unit,
      conversionFactor: Number(c.conversionFactor || 1),
      isBreakPackOfId: c.isBreakPackOfId ? Number(c.isBreakPackOfId) : null,
    }));

    const events: ReplayTimelineEvent[] = [];

    // 1. Good Receipts (strictly active lines and non-VOID receipts)
    const grLines = await tx
      .select({
        id: goodReceiptLines.id,
        combinationId: goodReceiptLines.combinationId,
        quantity: goodReceiptLines.quantity,
        purchasePrice: goodReceiptLines.purchasePrice,
        discount: goodReceiptLines.discount,
        createdAt: goodReceiptLines.createdAt,
      })
      .from(goodReceiptLines)
      .innerJoin(goodReceipts, eq(goodReceipts.id, goodReceiptLines.goodReceiptId))
      .where(
        and(
          inArray(goodReceiptLines.combinationId, comboIds),
          isNull(goodReceiptLines.deletedAt),
          isNull(goodReceipts.deletedAt),
          ne(goodReceipts.status, "VOID"),
        ),
      );

    for (const line of grLines) {
      const lineQty = Number(line.quantity || 0);
      const unitPrice = Number(line.purchasePrice || 0);
      const discount = Number(line.discount || 0);
      const netUnitCost = lineQty > 0 ? (lineQty * unitPrice - discount) / lineQty : unitPrice;

      events.push({
        id: line.id,
        type: "GOOD_RECEIPT",
        createdAt: line.createdAt ? new Date(line.createdAt) : new Date(0),
        combinationId: line.combinationId,
        quantity: lineQty,
        unitCost: netUnitCost,
      });
    }

    // 2. BreakPacks / RePacks
    const bpRows = await tx
      .select()
      .from(breakPacks)
      .where(
        sql`${breakPacks.fromCombinationId} IN ${comboIds} OR ${breakPacks.toCombinationId} IN ${comboIds}`,
      );

    for (const bp of bpRows) {
      events.push({
        id: bp.id,
        type: bp.type as "BREAK_PACK" | "RE_PACK",
        createdAt: bp.createdAt ? new Date(bp.createdAt) : new Date(0),
        fromCombinationId: bp.fromCombinationId,
        toCombinationId: bp.toCombinationId,
        quantity: Number(bp.quantity || 0),
        conversionFactor: Number(bp.conversionFactor || 1),
      });
    }

    // 3. Sales Order Movements from InventoryMovements
    const soMoves = await tx
      .select({
        id: inventoryMovements.id,
        combinationId: inventoryMovements.combinationId,
        quantity: inventoryMovements.quantity,
        costPerUnit: inventoryMovements.costPerUnit,
        totalCost: inventoryMovements.totalCost,
        createdAt: inventoryMovements.createdAt,
      })
      .from(inventoryMovements)
      .where(
        sql`${inventoryMovements.combinationId} IN ${comboIds} AND ${inventoryMovements.referenceType} = 'SALES_ORDER'`,
      );

    for (const som of soMoves) {
      const moveQty = Math.abs(Number(som.quantity || 0));
      events.push({
        id: som.id,
        movementId: som.id,
        type: "SALES_ORDER",
        createdAt: som.createdAt ? new Date(som.createdAt) : new Date(0),
        combinationId: som.combinationId,
        quantity: moveQty,
        recordedCostPrice: Number(som.costPerUnit || 0),
        salesOrderItemId: som.id,
      });
    }

    // 4. Stock Adjustments
    const saRows = await tx
      .select({
        id: stockAdjustments.id,
        combinationId: stockAdjustments.combinationId,
        difference: stockAdjustments.difference,
        createdAt: stockAdjustments.createdAt,
      })
      .from(stockAdjustments)
      .where(inArray(stockAdjustments.combinationId, comboIds));

    for (const sa of saRows) {
      events.push({
        id: sa.id,
        type: "STOCK_ADJUSTMENT",
        createdAt: sa.createdAt ? new Date(sa.createdAt) : new Date(0),
        combinationId: sa.combinationId,
        quantity: Number(sa.difference || 0),
      });
    }

    // 5. Legacy BreakPack/RePack movements from InventoryMovements not tracked in BreakPacks table
    const legacyBpMoves = await tx
      .select({
        id: inventoryMovements.id,
        type: inventoryMovements.type,
        combinationId: inventoryMovements.combinationId,
        quantity: inventoryMovements.quantity,
        costPerUnit: inventoryMovements.costPerUnit,
        createdAt: inventoryMovements.createdAt,
      })
      .from(inventoryMovements)
      .where(
        sql`${inventoryMovements.combinationId} IN ${comboIds} 
          AND ${inventoryMovements.referenceType} = 'BREAK_PACK' 
          AND NOT EXISTS (
            SELECT 1 FROM ${breakPacks} bp WHERE bp.id = ${inventoryMovements.referenceId}
          )`,
      );

    for (const lbp of legacyBpMoves) {
      const qty = Math.abs(Number(lbp.quantity || 0));
      const cost = Number(lbp.costPerUnit || 0);
      if (lbp.type === "BREAK_PACK_IN" || lbp.type === "RE_PACK_IN") {
        events.push({
          id: lbp.id,
          type: "GOOD_RECEIPT",
          createdAt: lbp.createdAt ? new Date(lbp.createdAt) : new Date(0),
          combinationId: lbp.combinationId,
          quantity: qty,
          unitCost: cost,
        });
      } else {
        events.push({
          id: lbp.id,
          movementId: lbp.id,
          salesOrderItemId: lbp.id,
          type: "SALES_ORDER",
          createdAt: lbp.createdAt ? new Date(lbp.createdAt) : new Date(0),
          combinationId: lbp.combinationId,
          quantity: qty,
          recordedCostPrice: cost,
        });
      }
    }

    // 6. Return movements from InventoryMovements (SUPPLIER_RETURN_OUT and RETURN_IN)
    const returnMoves = await tx
      .select({
        id: inventoryMovements.id,
        type: inventoryMovements.type,
        combinationId: inventoryMovements.combinationId,
        quantity: inventoryMovements.quantity,
        costPerUnit: inventoryMovements.costPerUnit,
        createdAt: inventoryMovements.createdAt,
      })
      .from(inventoryMovements)
      .where(
        sql`${inventoryMovements.combinationId} IN ${comboIds} 
          AND ${inventoryMovements.type} IN ('SUPPLIER_RETURN_OUT', 'RETURN_IN')`,
      );

    for (const rm of returnMoves) {
      const qty = Math.abs(Number(rm.quantity || 0));
      const cost = Number(rm.costPerUnit || 0);
      if (rm.type === "SUPPLIER_RETURN_OUT") {
        events.push({
          id: rm.id,
          movementId: rm.id,
          type: "SUPPLIER_RETURN",
          createdAt: rm.createdAt ? new Date(rm.createdAt) : new Date(0),
          combinationId: rm.combinationId,
          quantity: qty,
          unitCost: cost,
        });
      } else if (rm.type === "RETURN_IN") {
        events.push({
          id: rm.id,
          movementId: rm.id,
          type: "RETURN",
          createdAt: rm.createdAt ? new Date(rm.createdAt) : new Date(0),
          combinationId: rm.combinationId,
          quantity: qty,
          unitCost: cost,
        });
      }
    }

    // Current DB state representation
    const currentDbState = {
      productId,
      combinations: combos.map((c: any) => ({
        combinationId: c.id,
        dbAveragePrice: Number(c.inventory?.averagePrice || 0),
        dbQuantity: Number(c.inventory?.quantity || 0),
      })),
      salesOrderItems: soMoves.map((so: any) => ({
        id: so.id,
        combinationId: so.combinationId,
        dbCostPrice: Number(so.costPerUnit || 0),
        quantity: Math.abs(Number(so.quantity || 0)),
      })),
    };

    return { combinationsMeta, events, currentDbState };
  },

  /**
   * Dry-run simulation for a single product without mutating the database.
   */
  dryRunProduct: async (
    productId: number,
    options: { costOnly?: boolean } = { costOnly: true },
    tx: any = db,
  ): Promise<ProductReplayDiff | null> => {
    const data = await inventoryReplayServerService.fetchProductTimelineData(productId, tx);
    if (!data) return null;

    const sim = simulateProductTimeline(data.combinationsMeta, data.events);
    return generateProductReplayDiff(data.currentDbState, sim, options);
  },

  /**
   * Applies recalculated values for a single product inside a transaction.
   * Strict Invariant: Only averagePrice and Sales Order COGS are updated; physical on-hand quantity is IMMUTABLE.
   */
  applyProduct: async (
    productId: number,
    options: { costOnly?: boolean } = { costOnly: true },
    tx: any = db,
  ): Promise<ProductReplayDiff | null> => {
    const data = await inventoryReplayServerService.fetchProductTimelineData(productId, tx);
    if (!data) return null;

    const sim = simulateProductTimeline(data.combinationsMeta, data.events);
    const diff = generateProductReplayDiff(data.currentDbState, sim, options);

    // Apply updates to Inventories (COST-ONLY IMMUTABILITY: Never overwrite physical on-hand quantity)
    for (const [combId, state] of sim.combinations.entries()) {
      await tx
        .update(inventories)
        .set({
          averagePrice: String(state.averagePrice),
          updatedAt: new Date(),
        })
        .where(eq(inventories.combinationId, combId));
    }

    // Apply updates to InventoryMovements (Sales Order OUT costs)
    for (const so of sim.salesOrderUpdates) {
      if (Math.abs(so.costDifference) > 0.0001) {
        await tx
          .update(inventoryMovements)
          .set({
            costPerUnit: String(so.recalculatedCostPrice),
            totalCost: String(-1 * so.quantity * so.recalculatedCostPrice),
          })
          .where(eq(inventoryMovements.id, so.salesOrderItemId));
      }
    }

    return diff;
  },
};

