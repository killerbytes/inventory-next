// @vitest-environment node
import { GoodReceiptInput } from "@/schemas";
import {
  Inventory,
  InventoryMovement,
  ReturnItem,
  ReturnTransaction,
  User,
} from "@/server/models";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { productCombinationServerService } from "@/server/services/productCombinationServer.service";
import { ORDER_TYPE, RETURN_TYPE } from "@/types/definitions";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupDatabase } from "../setup";
import {
  createCategory,
  createCombination,
  createGoodReceipt,
  createProduct,
  createSupplier,
  createUser,
  createVariantType,
} from "../utils/fixtures";

describe("Good Receipt Service (Integration)", () => {
  let user0: User;

  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    user0 = await createUser(0);
    await createCategory(0);
    await createCategory(1);
    await createProduct(0);
    await createProduct(1);
    await createVariantType(0);
    await createSupplier(0);
    await createCombination();
  });

  const defaultReceiptLines = () => [
    { combinationId: 1, quantity: 10, purchasePrice: 100 },
    { combinationId: 2, quantity: 20, discount: 10, purchasePrice: 100 },
  ];

  const createMockReceipt = async (
    lines: any = null,
    updatePayload: any = null,
  ) => {
    const payload: GoodReceiptInput = {
      supplierId: 1,
      receiptDate: new Date(),
      referenceNo: "Test Notes",
      internalNotes: "Test Internal Notes",
      goodReceiptLines: lines || defaultReceiptLines(),
    };
    const gr = await goodReceiptServerService.create(payload, user0.id);

    if (updatePayload) {
      if (typeof updatePayload === "string") {
        await goodReceiptServerService.update(
          gr.id,
          {
            status: updatePayload,
            goodReceiptLines: payload.goodReceiptLines,
          },
          user0.id,
        );
      } else {
        await goodReceiptServerService.update(
          gr.id,
          {
            status: updatePayload.status || "RECEIVED",
            goodReceiptLines:
              updatePayload.goodReceiptLines || payload.goodReceiptLines,
          },
          user0.id,
        );
      }
    }
    return gr;
  };

  it("should create a good receipt", async () => {
    await createMockReceipt();
    const goodReceipt = await goodReceiptServerService.get(1);

    expect(goodReceipt).toBeDefined();
    expect(goodReceipt?.supplierId).toBe(1);
    expect(goodReceipt?.receiptDate).toBeInstanceOf(Date);
    expect(goodReceipt?.referenceNo).toBe("Test Notes");
    expect(goodReceipt?.internalNotes).toBe("Test Internal Notes");
    expect(goodReceipt?.goodReceiptLines?.length).toBe(2);
    expect(Number(goodReceipt?.totalAmount)).toBe(2990);
    expect(goodReceipt?.status).toBe("DRAFT");
    expect((goodReceipt as any)?.goodReceiptStatusHistory?.length).toBe(1);
    expect((goodReceipt as any)?.goodReceiptStatusHistory[0]?.status).toBe(
      "DRAFT",
    );
    expect(
      (goodReceipt as any)?.goodReceiptStatusHistory[0]?.user?.username,
    ).toBe("alice");
  });

  it("should update a good receipt", async () => {
    await createMockReceipt();

    await goodReceiptServerService.update(
      1,
      {
        status: "RECEIVED",
        goodReceiptLines: [
          { combinationId: 1, quantity: 11, purchasePrice: 100 },
          { combinationId: 2, quantity: 20, discount: 10, purchasePrice: 200 },
        ],
      },
      user0.id,
    );

    const goodReceipt2 = await goodReceiptServerService.get(1);
    const inventory = await Inventory.findAll();

    expect(goodReceipt2?.status).toBe("RECEIVED");
    expect(Number(goodReceipt2?.totalAmount)).toBe(5090);
    expect(goodReceipt2?.goodReceiptLines?.length).toBe(2);
    expect(Number(goodReceipt2?.goodReceiptLines?.[0]?.quantity)).toBe(11);
    expect(goodReceipt2?.goodReceiptLines?.[0]?.nameSnapshot).toBe(
      "Shovel - Red",
    );
    expect(goodReceipt2?.goodReceiptLines?.[0]?.categorySnapshot?.name).toBe(
      "Tools",
    );
    expect(goodReceipt2?.goodReceiptLines?.[0]?.categorySnapshot?.id).toBe(1);
    expect(goodReceipt2?.goodReceiptLines?.[0]?.variantSnapshot).toMatchObject({
      Colors: "Red",
    });
    expect(goodReceipt2?.goodReceiptLines?.[0]?.skuSnapshot).toBe(
      "01-SHO-BOX-RED",
    );
    expect((goodReceipt2 as any)?.goodReceiptStatusHistory?.length).toBe(2);
    expect((goodReceipt2 as any)?.goodReceiptStatusHistory[0]?.status).toBe(
      "RECEIVED",
    );
    expect(
      (goodReceipt2 as any)?.goodReceiptStatusHistory[0]?.user?.username,
    ).toBe("alice");
    expect(inventory.length).toBe(2);
    expect(Number(inventory[0].quantity)).toBe(11);
    expect(Number(inventory[1].quantity)).toBe(20);

    // Update second receipt
    await createMockReceipt();
    await goodReceiptServerService.update(
      2,
      {
        status: "RECEIVED",
        goodReceiptLines: [
          { combinationId: 1, quantity: 11, purchasePrice: 100 },
          { combinationId: 2, quantity: 20, discount: 10, purchasePrice: 100 },
        ],
      },
      user0.id,
    );
    const inventory2 = await Inventory.findAll();

    expect(inventory2.length).toBe(2);
    expect(Number(inventory2[0].quantity)).toBe(22);
    expect(Number(inventory2[1].quantity)).toBe(40);
  });

  it("should complete a good receipt", async () => {
    // complete status is updated by invoice creation
  });

  it("should void a good receipt", async () => {
    await createMockReceipt();
    await goodReceiptServerService.delete(1);
    const goodReceipt = await goodReceiptServerService.get(1);

    expect(goodReceipt?.status).toBe("VOID");
    expect((goodReceipt as any)?.goodReceiptStatusHistory?.length).toBe(2);
    expect((goodReceipt as any)?.goodReceiptStatusHistory[0]?.status).toBe(
      "VOID",
    );
    expect(
      (goodReceipt as any)?.goodReceiptStatusHistory[0]?.user?.username,
    ).toBe("alice");
  });

  it("should get a paginated list of good receipts", async () => {
    await createMockReceipt();
    await createMockReceipt();

    const goodReceipts = await (goodReceiptServerService as any).getAll({
      page: 1,
      limit: 2,
    });

    expect(goodReceipts.data.length).toBe(2);
    expect(goodReceipts.meta.total).toBe(2);
    expect(goodReceipts.meta.totalPages).toBe(1);
    expect(goodReceipts.meta.currentPage).toBe(1);
  });

  it("should get a list of good receipts by supplier", async () => {
    await createSupplier(1);
    await createGoodReceipt(0, user0.id);
    await createGoodReceipt(1, user0.id);
    await createGoodReceipt(2, user0.id);
    await createGoodReceipt(3, user0.id);

    const goodReceipts = await goodReceiptServerService.getBySupplierId(1, {
      status: "DRAFT",
    });
    expect(goodReceipts.data.length).toBe(3);

    const goodReceipts2 = await goodReceiptServerService.getBySupplierId(2, {
      status: "DRAFT",
    });
    expect(goodReceipts2.data.length).toBe(1);

    const goodReceipts3 = await goodReceiptServerService.getBySupplierId(2, {
      status: "POSTED",
    });
    expect(goodReceipts3.data.length).toBe(0);
  });

  it("should not allow return if status is DRAFT", async () => {
    await createMockReceipt();
    const returns = [
      { combinationId: 1, quantity: 11 },
      { combinationId: 2, quantity: 20 },
    ];

    await expect(
      goodReceiptServerService.supplierReturns(1, returns as any, "reason"),
    ).rejects.toThrow("Good Receipt is not in a valid state: DRAFT");
  });

  it("should not allow return if status is VOID", async () => {
    await createMockReceipt();
    await goodReceiptServerService.delete(1);

    const returns = [
      { combinationId: 1, quantity: 11 },
      { combinationId: 2, quantity: 20 },
    ];

    await expect(
      goodReceiptServerService.supplierReturns(1, returns as any, "reason"),
    ).rejects.toThrow("Good Receipt is not in a valid state: VOID");
  });

  it("should return to supplier", async () => {
    await createMockReceipt(null, {
      status: "RECEIVED",
      goodReceiptLines: [
        { combinationId: 1, quantity: 11, purchasePrice: 100 },
        { combinationId: 2, quantity: 20, discount: 10, purchasePrice: 100 },
      ],
    });

    const returns = [
      { combinationId: 1, quantity: 11 },
      { combinationId: 2, quantity: 20 },
    ];
    const result = await goodReceiptServerService.supplierReturns(
      1,
      returns as any,
      "reason",
    );
    const inventory = await Inventory.findAll();
    const inventoryMovement = await InventoryMovement.findAll();
    const returnTransaction = await ReturnTransaction.findAll();
    const returnItems = await ReturnItem.findAll();

    expect(result.success).toBe(true);
    expect(Number(inventory[0].quantity)).toBe(0);
    expect(Number(inventory[0].averagePrice)).toBe(100);
    expect(Number(inventory[1].quantity)).toBe(0);
    expect(Number(inventory[1].averagePrice)).toBe(99.5);
    expect(inventoryMovement.length).toBe(4);
    expect(inventoryMovement[2].id).toBe(3);
    expect(inventoryMovement[2].type).toBe(RETURN_TYPE.SUPPLIER_RETURN_OUT);
    expect(inventoryMovement[2].referenceType).toBe("GOOD_RECEIPT");
    expect(Number(inventoryMovement[2].quantity)).toBe(-11);
    expect(inventoryMovement[3].type).toBe(RETURN_TYPE.SUPPLIER_RETURN_OUT);
    expect(inventoryMovement[3].referenceType).toBe("GOOD_RECEIPT");
    expect(Number(inventoryMovement[3].quantity)).toBe(-20);
    expect(returnTransaction.length).toBe(1);
    expect(returnTransaction[0].id).toBe(1);
    expect(returnTransaction[0].sourceType).toBe(ORDER_TYPE.PURCHASE);
    expect(returnTransaction[0].type).toBe(RETURN_TYPE.SUPPLIER_RETURN_OUT);
    expect(Number(returnTransaction[0].totalReturnAmount)).toBe(3090);
    expect(Number(returnTransaction[0].paymentDifference)).toBe(-3090);
    expect(returnItems.length).toBe(2);
    expect(returnItems[0].id).toBe(1);
    expect(returnItems[0].returnTransactionId).toBe(1);
    expect(Number(returnItems[0].quantity)).toBe(11);
    expect(Number(returnItems[0].unitPrice)).toBe(100);
    expect(returnItems[0].reason).toBe("reason");
    expect(returnItems[0].combinationId).toBe(1);
    expect(Number(returnItems[0].totalAmount)).toBe(1100);
    expect(returnItems[1].id).toBe(2);
    expect(returnItems[1].returnTransactionId).toBe(1);
    expect(Number(returnItems[1].quantity)).toBe(20);
    expect(Number(returnItems[1].unitPrice)).toBe(99.5);
    expect(returnItems[1].reason).toBe("reason");
    expect(returnItems[1].combinationId).toBe(2);
    expect(Number(returnItems[1].totalAmount)).toBe(1990);
  });

  it("should return to supplier twice", async () => {
    await createMockReceipt(
      [{ combinationId: 1, quantity: 10, purchasePrice: 100 }],
      "RECEIVED",
    );

    const returns = [
      { combinationId: 1, quantity: 1 },
      { combinationId: 2, quantity: 0 },
    ];

    await goodReceiptServerService.supplierReturns(1, returns, "reason");
    await goodReceiptServerService.supplierReturns(1, returns, "reason");

    const returnTransaction = await ReturnTransaction.findAll();
    const returnItems = await ReturnItem.findAll();

    expect(returnTransaction.length).toBe(2);
    expect(returnTransaction[0].id).toBe(1);
    expect(returnTransaction[0].referenceId).toBe(1);
    expect(returnTransaction[0].sourceType).toBe("PURCHASE");
    expect(returnTransaction[0].type).toBe(RETURN_TYPE.SUPPLIER_RETURN_OUT);
    expect(Number(returnTransaction[0].totalReturnAmount)).toBe(100);
    expect(Number(returnTransaction[0].paymentDifference)).toBe(-100);
    expect(returnTransaction[1].id).toBe(2);
    expect(returnTransaction[1].referenceId).toBe(1);
    expect(returnTransaction[1].sourceType).toBe("PURCHASE");
    expect(returnTransaction[1].type).toBe(RETURN_TYPE.SUPPLIER_RETURN_OUT);
    expect(Number(returnTransaction[1].totalReturnAmount)).toBe(100);
    expect(Number(returnTransaction[1].paymentDifference)).toBe(-100);

    expect(returnItems.length).toBe(2);
    expect(returnItems[0].id).toBe(1);
    expect(returnItems[0].returnTransactionId).toBe(1);
    expect(Number(returnItems[0].quantity)).toBe(1);
    expect(Number(returnItems[0].unitPrice)).toBe(100);
    expect(returnItems[0].reason).toBe("reason");
    expect(returnItems[0].combinationId).toBe(1);
    expect(Number(returnItems[0].totalAmount)).toBe(100);

    expect(returnItems[1].id).toBe(2);
    expect(returnItems[1].returnTransactionId).toBe(2);
    expect(Number(returnItems[1].quantity)).toBe(1);
    expect(Number(returnItems[1].unitPrice)).toBe(100);
    expect(returnItems[1].reason).toBe("reason");
    expect(returnItems[1].combinationId).toBe(1);
    expect(Number(returnItems[1].totalAmount)).toBe(100);

    const inv = await Inventory.findAll();
    expect(Number(inv[0].quantity)).toBe(8);
  });

  it("should not allow return to supplier if more than the actual order quantity", async () => {
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: 1,
        newQuantity: 10,
        reason: "EXPIRED",
        notes: "test",
      },
      user0.id,
    );
    await createMockReceipt(
      [{ combinationId: 1, quantity: 10, purchasePrice: 100 }],
      "RECEIVED",
    );

    const returns = [{ combinationId: 1, quantity: 2 }];

    await goodReceiptServerService.supplierReturns(1, returns as any, "reason");
    await goodReceiptServerService.supplierReturns(1, returns as any, "reason");

    await expect(
      goodReceiptServerService.supplierReturns(
        1,
        [{ combinationId: 1, quantity: 10 }] as any,
        "reason",
      ),
    ).rejects.toThrow("Return quantity exceeds order quantity");
  });

  it("should get Good Receipt with its Return history", async () => {
    await createMockReceipt(
      [{ combinationId: 1, quantity: 10, purchasePrice: 100 }],
      "RECEIVED",
    );
    await goodReceiptServerService.supplierReturns(
      1,
      [{ combinationId: 1, quantity: 2 }] as any,
      "Defective",
    );

    const result = await goodReceiptServerService.getGoodReceiptWithReturns(1);

    expect(result.goodReceiptId).toBe(1);
    expect(result.items.length).toBe(1);
    expect(result.items[0].receivedQty).toBe(10);
    expect(result.items[0].returnedQty).toBe(2);
    expect(result.items[0].netQty).toBe(8);
    expect(result.items[0].returnHistory.length).toBe(1);
    expect(result.items[0].returnHistory[0].qty).toBe(2);
    expect(result.items[0].returnHistory[0].reason).toBe("Defective");
  });

  it("should get previous prices by product combination list", async () => {
    await createMockReceipt([
      { combinationId: 1, quantity: 5, purchasePrice: 200 },
    ]);

    const result = await goodReceiptServerService.getByProductCombination([1]);
    expect(result.length).toBe(1);
    expect(result[0].comboId).toBe(1);
    expect(Number(result[0].purchasePrice)).toBe(200);
    expect(Number(result[0].unitPrice)).toBe(200);
  });

  it("should update order lines of a DRAFT good receipt", async () => {
    await createMockReceipt([
      { combinationId: 1, quantity: 10, purchasePrice: 100 },
    ]);

    await goodReceiptServerService.update(
      1,
      {
        status: "DRAFT",
        goodReceiptLines: [
          { combinationId: 1, quantity: 15, purchasePrice: 100 },
        ],
      },
      user0.id,
    );

    const gr = await goodReceiptServerService.get(1);
    expect(gr?.status).toBe("DRAFT");
    expect(Number(gr?.goodReceiptLines?.[0]?.quantity)).toBe(15);
  });

  it("should throw error when transitioning from invalid statuses", async () => {
    await createMockReceipt(
      [{ combinationId: 1, quantity: 10, purchasePrice: 100 }],
      "RECEIVED",
    );

    await expect(
      goodReceiptServerService.update(
        1,
        {
          status: "DRAFT",
          goodReceiptLines: [
            { combinationId: 1, quantity: 10, purchasePrice: 100 },
          ],
        },
        user0.id,
      ),
    ).rejects.toThrow();
  });

  it("should throw error when deleting a good receipt that is not DRAFT", async () => {
    await createMockReceipt(
      [{ combinationId: 1, quantity: 10, purchasePrice: 100 }],
      "RECEIVED",
    );
    await expect(goodReceiptServerService.delete(1)).rejects.toThrow(
      "Good Receipt is not in a valid state",
    );
  });

  it("should throw an error for a non-existent good receipt", async () => {
    await expect(goodReceiptServerService.get(9999)).resolves.toBeNull();
  });

  it("should filter by receiptDate with end-of-day boundary safety and exclude next month records", async () => {
    // Arrange: Create Receipt on July 31st (inside July)
    const receiptJuly = await goodReceiptServerService.create(
      {
        supplierId: 1,
        receiptDate: new Date("2026-07-31T10:00:00"),
        referenceNo: "GR-JULY-31",
        goodReceiptLines: [{ combinationId: 1, quantity: 5, purchasePrice: 50 }],
      },
      user0.id,
    );

    // Create Receipt on August 1st midnight local (represented as 2026-07-31 16:00:00Z in UTC if in GMT+8, or 2026-08-01 local)
    const receiptAugust = await goodReceiptServerService.create(
      {
        supplierId: 1,
        receiptDate: new Date("2026-08-01T00:00:00"),
        referenceNo: "GR-AUG-01",
        goodReceiptLines: [{ combinationId: 1, quantity: 10, purchasePrice: 50 }],
      },
      user0.id,
    );

    // Act: Query for July 2026 (2026-07-01 to 2026-07-31)
    const result = await goodReceiptServerService.getAll({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });

    // Assert: Only July receipt should be returned; August 1st must be strictly excluded
    const returnedIds = result.data.map((r: any) => r.id);
    expect(returnedIds).toContain(receiptJuly?.id);
    expect(returnedIds).not.toContain(receiptAugust?.id);
  });

  it("should prevent cross-receipt line item IDOR overwrites during update", async () => {
    // Arrange: Receipt A
    const receiptA = await goodReceiptServerService.create(
      {
        supplierId: 1,
        receiptDate: new Date(),
        referenceNo: "GR-RECA",
        goodReceiptLines: [{ combinationId: 1, quantity: 10, purchasePrice: 100 }],
      },
      user0.id,
    );

    // Receipt B
    const receiptB = await goodReceiptServerService.create(
      {
        supplierId: 1,
        receiptDate: new Date(),
        referenceNo: "GR-RECB",
        goodReceiptLines: [{ combinationId: 1, quantity: 50, purchasePrice: 200 }],
      },
      user0.id,
    );

    const lineB = receiptB?.goodReceiptLines?.[0];
    expect(lineB).toBeDefined();

    // Act: Attempt to update Receipt A but specify lineB's ID with tampered values
    await goodReceiptServerService.update(
      receiptA!.id,
      {
        goodReceiptLines: [
          {
            id: lineB!.id,
            combinationId: 1,
            quantity: 999,
            purchasePrice: 1,
          },
        ],
      },
      user0.id,
    );

    // Assert: Line B on Receipt B must NOT have been modified
    const refreshedReceiptB = await goodReceiptServerService.get(receiptB!.id);
    const lineBAfter = refreshedReceiptB?.goodReceiptLines?.find((l) => l.id === lineB!.id);
    expect(lineBAfter).toBeDefined();
    expect(Number(lineBAfter?.quantity)).toBe(50);
    expect(Number(lineBAfter?.purchasePrice)).toBe(200);
  });
});

