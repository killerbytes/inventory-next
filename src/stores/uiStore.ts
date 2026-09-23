import {
  CategoryData,
  CustomerData,
  InvoiceData,
  ProductCombinationData,
  ProductData,
  SalesOrderData,
  SupplierData,
  UserData,
} from "@/schemas";
import { create } from "zustand";

interface UIState {
  isUserModalOpen: boolean;
  editingUser?: UserData | null;
  setUserModalOpen: (open: boolean, user?: UserData | null) => void;
  isSalesOrderModalOpen: boolean;
  editingSalesOrder?: SalesOrderData | null;
  setSalesOrderModalOpen: (
    open: boolean,
    salesOrder?: SalesOrderData | null,
  ) => void;
  isProductModalOpen: boolean;
  editingProduct: ProductData | null;
  setProductModalOpen: (open: boolean, product?: ProductData | null) => void;
  isBreakPackModalOpen: boolean;
  editingCombination?: ProductCombinationData | null;
  setBreakPackModalOpen: (
    open: boolean,
    combination?: ProductCombinationData | null,
  ) => void;
  isCombinationModalOpen: boolean;
  setCombinationModalOpen: (open: boolean) => void;
  isVariantModalOpen: boolean;
  setVariantModalOpen: (open: boolean) => void;
  isCustomerModalOpen: boolean;
  editingCustomer?: CustomerData | null;
  setCustomerModalOpen: (open: boolean, customer?: CustomerData | null) => void;
  isCategoryModalOpen: boolean;
  editingCategory?: CategoryData | null;
  setCategoryModalOpen: (open: boolean, category?: CategoryData | null) => void;
  isStockAdjustmentModalOpen: boolean;
  setStockAdjustmentModalOpen: (
    open: boolean,
    combination?: ProductCombinationData | null,
  ) => void;
  isBarcodePrinterModalOpen: boolean;
  setBarcodePrinterModalOpen: (open: boolean) => void;
  isSupplierModalOpen: boolean;
  editingSupplier?: SupplierData | null;
  setSupplierModalOpen: (open: boolean, supplier?: SupplierData | null) => void;
  isReturnExchangeModalOpen: boolean;
  setReturnExchangeModalOpen: (open: boolean) => void;
  isInvoiceModalOpen: boolean;
  editingInvoice?: InvoiceData | null;
  setInvoiceModalOpen: (open: boolean, invoice?: InvoiceData | null) => void;
  isGoodReceiptPickerModalOpen: boolean;
  setGoodReceiptPickerModalOpen: (open: boolean) => void;
  isOrderHistoryModalOpen: boolean;
  setOrderHistoryModalOpen: (open: boolean) => void;
  isChangePasswordModalOpen: boolean;
  setChangePasswordModalOpen: (open: boolean) => void;
  isAdminPanelModalOpen: boolean;
  setAdminPanelModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isUserModalOpen: false,
  editingUser: null,
  isSalesOrderModalOpen: false,
  editingSalesOrder: null,
  setSalesOrderModalOpen: (open, salesOrder = null) =>
    set({ isSalesOrderModalOpen: open, editingSalesOrder: salesOrder }),
  setUserModalOpen: (open, user = null) =>
    set({ isUserModalOpen: open, editingUser: user }),
  isProductModalOpen: false,
  editingProduct: null,
  setProductModalOpen: (open, product = null) =>
    set({ isProductModalOpen: open, editingProduct: product }),
  isBreakPackModalOpen: false,
  editingCombination: null,
  setBreakPackModalOpen: (open, combination) =>
    set({ isBreakPackModalOpen: open, editingCombination: combination }),
  isCombinationModalOpen: false,
  setCombinationModalOpen: (open) => set({ isCombinationModalOpen: open }),
  isVariantModalOpen: false,
  setVariantModalOpen: (open) => set({ isVariantModalOpen: open }),
  isCustomerModalOpen: false,
  setCustomerModalOpen: (open, customer = null) =>
    set({ isCustomerModalOpen: open, editingCustomer: customer }),
  isCategoryModalOpen: false,
  editingCategory: null,
  setCategoryModalOpen: (open, category = null) =>
    set({ isCategoryModalOpen: open, editingCategory: category }),
  isStockAdjustmentModalOpen: false,
  setStockAdjustmentModalOpen: (open, combination = null) =>
    set({ isStockAdjustmentModalOpen: open, editingCombination: combination }),
  isBarcodePrinterModalOpen: false,
  setBarcodePrinterModalOpen: (open) =>
    set({ isBarcodePrinterModalOpen: open }),
  isSupplierModalOpen: false,
  editingSupplier: null,
  setSupplierModalOpen: (open, supplier = null) =>
    set({ isSupplierModalOpen: open, editingSupplier: supplier }),
  isReturnExchangeModalOpen: false,
  setReturnExchangeModalOpen: (open) =>
    set({ isReturnExchangeModalOpen: open }),
  isInvoiceModalOpen: false,
  setInvoiceModalOpen: (open, invoice = null) =>
    set({ isInvoiceModalOpen: open, editingInvoice: invoice }),
  isGoodReceiptPickerModalOpen: false,
  setGoodReceiptPickerModalOpen: (open) =>
    set({ isGoodReceiptPickerModalOpen: open }),
  isOrderHistoryModalOpen: false,
  setOrderHistoryModalOpen: (open) => set({ isOrderHistoryModalOpen: open }),
  isChangePasswordModalOpen: false,
  setChangePasswordModalOpen: (open) =>
    set({ isChangePasswordModalOpen: open }),
  isAdminPanelModalOpen: false,
  setAdminPanelModalOpen: (open) => set({ isAdminPanelModalOpen: open }),
}));
