import { describe, expect, it, beforeEach } from "vitest";
import {
  DRAFT_STORAGE_KEYS,
  serializeDraft,
  deserializeDraft,
  saveDraft,
  loadDraft,
  clearDraft,
} from "@/lib/draftStorage";
import { SalesOrderInputSchema, SalesOrderInput } from "@/schemas/salesOrder.schema";
import { GoodReceiptInputSchema, GoodReceiptInput } from "@/schemas/goodReceipt.schema";
import { MODE_OF_PAYMENT, ORDER_STATUS } from "@/types/definitions";

describe("Generic Draft Storage Utility (Unit)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("serializeDraft", () => {
    it("should serialize an object replacing undefined values with null", () => {
      // Arrange
      const input = {
        name: "Test Order",
        note: undefined,
        amount: 100,
      };

      // Act
      const result = serializeDraft(input);

      // Assert
      expect(result).toBe('{"name":"Test Order","note":null,"amount":100}');
    });
  });

  describe("deserializeDraft & date hydration", () => {
    it("should deserialize and convert specified date fields into valid Date instances", () => {
      // Arrange
      const nowIso = "2026-09-21T12:30:00.000Z";
      const rawJson = JSON.stringify({
        referenceNo: "GR-001",
        receiptDate: nowIso,
        otherDate: nowIso,
        supplierId: 5,
      });

      // Act
      const result = deserializeDraft<{
        referenceNo: string;
        receiptDate: Date;
        otherDate: string;
        supplierId: number;
      }>(rawJson, ["receiptDate"]);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.receiptDate).toBeInstanceOf(Date);
      expect(result?.receiptDate.toISOString()).toBe(nowIso);
      expect(typeof result?.otherDate).toBe("string");
    });

    it("should handle multiple date fields simultaneously", () => {
      // Arrange
      const date1 = "2026-09-21T00:00:00.000Z";
      const date2 = "2026-09-25T00:00:00.000Z";
      const rawJson = JSON.stringify({
        orderDate: date1,
        deliveryDate: date2,
        dueDate: date2,
      });

      // Act
      const result = deserializeDraft<{
        orderDate: Date;
        deliveryDate: Date;
        dueDate: Date;
      }>(rawJson, ["orderDate", "deliveryDate", "dueDate"]);

      // Assert
      expect(result?.orderDate).toBeInstanceOf(Date);
      expect(result?.deliveryDate).toBeInstanceOf(Date);
      expect(result?.dueDate).toBeInstanceOf(Date);
    });

    it("should safely return null on corrupted or invalid JSON", () => {
      // Act & Assert
      expect(deserializeDraft("{invalid-json")).toBeNull();
      expect(deserializeDraft("")).toBeNull();
      expect(deserializeDraft("12345")).toBeNull();
      expect(deserializeDraft("null")).toBeNull();
    });
  });

  describe("saveDraft, loadDraft, and clearDraft lifecycle", () => {
    it("should save and load a purchase good receipt draft satisfying GoodReceiptInputSchema", () => {
      // Arrange
      const receiptDate = new Date("2026-09-21T08:00:00.000Z");
      const mockReceipt: GoodReceiptInput = {
        referenceNo: "PO-2026-999",
        receiptDate,
        supplierId: 3,
        internalNotes: "Urgent purchase",
        goodReceiptLines: [
          {
            combinationId: 12,
            quantity: 10,
            purchasePrice: 45.5,
            discount: 5,
            discountNote: "Bulk",
          },
        ],
      };

      // Act
      saveDraft(DRAFT_STORAGE_KEYS.PURCHASE, mockReceipt);
      const loaded = loadDraft<GoodReceiptInput>(DRAFT_STORAGE_KEYS.PURCHASE, ["receiptDate"]);

      // Assert
      expect(loaded).not.toBeNull();
      expect(loaded?.referenceNo).toBe("PO-2026-999");
      expect(loaded?.receiptDate).toBeInstanceOf(Date);
      expect(loaded?.receiptDate.toISOString()).toBe(receiptDate.toISOString());

      const validation = GoodReceiptInputSchema.safeParse(loaded);
      expect(validation.success).toBe(true);
    });

    it("should save and load a sales order draft satisfying SalesOrderInputSchema", () => {
      // Arrange
      const orderDate = new Date("2026-09-21T09:00:00.000Z");
      const mockOrder: SalesOrderInput = {
        salesOrderNumber: "SO-DRY-001",
        customerId: 10,
        orderDate,
        modeOfPayment: MODE_OF_PAYMENT.CASH,
        status: ORDER_STATUS.RECEIVED,
        salesOrderItems: [
          {
            combinationId: 4,
            quantity: 2,
            discount: 0,
          },
        ],
      };

      // Act
      saveDraft(DRAFT_STORAGE_KEYS.SALES_ORDER, mockOrder);
      const loaded = loadDraft<SalesOrderInput>(DRAFT_STORAGE_KEYS.SALES_ORDER, [
        "orderDate",
        "deliveryDate",
        "dueDate",
      ]);

      // Assert
      expect(loaded).not.toBeNull();
      expect(loaded?.salesOrderNumber).toBe("SO-DRY-001");
      expect(loaded?.orderDate).toBeInstanceOf(Date);
      expect(loaded?.customerId).toBe(10);

      const validation = SalesOrderInputSchema.safeParse(loaded);
      expect(validation.success).toBe(true);
    });

    it("should clear stored draft by key without affecting other keys", () => {
      // Arrange
      saveDraft(DRAFT_STORAGE_KEYS.PURCHASE, { referenceNo: "PO-1" });
      saveDraft(DRAFT_STORAGE_KEYS.SALES_ORDER, { salesOrderNumber: "SO-1" });

      // Act
      clearDraft(DRAFT_STORAGE_KEYS.PURCHASE);

      // Assert
      expect(loadDraft(DRAFT_STORAGE_KEYS.PURCHASE)).toBeNull();
      expect(loadDraft(DRAFT_STORAGE_KEYS.SALES_ORDER)).not.toBeNull();
    });
  });
});
