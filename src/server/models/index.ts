import sequelize from "../db/sequelize";
import BreakPack from "./BreakPack";
import Category from "./Category";
import Customer from "./Customer";
import GoodReceipt from "./GoodReceipt";
import GoodReceiptLine from "./GoodReceiptLine";
import Invoice from "./Invoice";
import Payment from "./Payment";
import PriceHistory from "./PriceHistory";
import Product from "./Product";
import ReturnTransaction from "./ReturnTransaction";
import SalesOrder from "./SalesOrder";
import SalesOrderItem from "./SalesOrderItem";
import Supplier from "./Supplier";
import User from "./User";

import CombinationValue from "./CombinationValue";
import Inventory from "./Inventory";
import InventoryMovement from "./InventoryMovement";
import InvoiceLine from "./InvoiceLine";
import OrderStatusHistory from "./OrderStatusHistory";
import PaymentApplication from "./PaymentApplication";
import ProductCombination from "./ProductCombination";
import ReturnItem from "./ReturnItem";
import StockAdjustment from "./StockAdjustment";
import VariantType from "./VariantType";
import VariantValue from "./VariantValue";

// Associations matching inventory-api 1:1

// Category & Product
Category.hasMany(Category, {
  as: "subCategories",
  foreignKey: "parentId",
});
Category.belongsTo(Category, {
  as: "parent",
  foreignKey: "parentId",
});

Product.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
  onDelete: "RESTRICT",
});
Category.hasMany(Product, { foreignKey: "categoryId", as: "products" });
Product.hasMany(VariantType, { foreignKey: "productId", as: "variants" });
Product.hasMany(ProductCombination, {
  foreignKey: "productId",
  as: "combinations",
});

// ProductCombination & Variants
ProductCombination.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});
ProductCombination.belongsTo(ProductCombination, {
  foreignKey: "isBreakPackOfId",
  as: "parentCombination",
});
ProductCombination.hasMany(ProductCombination, {
  foreignKey: "isBreakPackOfId",
  as: "childCombinations",
});
ProductCombination.belongsToMany(VariantValue, {
  through: CombinationValue,
  foreignKey: "combinationId",
  as: "values",
});
VariantValue.belongsToMany(ProductCombination, {
  through: CombinationValue,
  foreignKey: "variantValueId",
});

VariantType.belongsTo(Product, { foreignKey: "productId" });
VariantType.hasMany(VariantValue, {
  foreignKey: "variantTypeId",
  as: "values",
});
VariantValue.belongsTo(VariantType, { foreignKey: "variantTypeId" });

// Inventory & Stock
ProductCombination.hasOne(Inventory, {
  foreignKey: "combinationId",
  as: "inventory",
});
Inventory.belongsTo(ProductCombination, {
  foreignKey: "combinationId",
  as: "combinations",
});
Inventory.hasMany(SalesOrderItem, {
  foreignKey: "inventoryId",
  as: "salesOrderItems",
});

// GoodReceipt & Lines
GoodReceipt.belongsTo(Supplier, { foreignKey: "supplierId", as: "supplier" });
GoodReceipt.hasMany(GoodReceiptLine, {
  foreignKey: "goodReceiptId",
  as: "goodReceiptLines",
});
GoodReceiptLine.belongsTo(GoodReceipt, {
  foreignKey: "goodReceiptId",
  as: "goodReceipt",
});
GoodReceiptLine.belongsTo(ProductCombination, {
  foreignKey: "combinationId",
  as: "combination",
});
GoodReceipt.hasMany(OrderStatusHistory, {
  foreignKey: "goodReceiptId",
  as: "goodReceiptStatusHistory",
});

// SalesOrder & Items
SalesOrder.belongsTo(Customer, { foreignKey: "customerId", as: "customer" });
SalesOrder.hasMany(SalesOrderItem, {
  foreignKey: "salesOrderId",
  as: "salesOrderItems",
});
SalesOrderItem.belongsTo(SalesOrder, {
  foreignKey: "salesOrderId",
  as: "salesOrder",
});
SalesOrderItem.belongsTo(ProductCombination, {
  foreignKey: "combinationId",
  as: "combinations",
});
ProductCombination.hasMany(SalesOrderItem, {
  foreignKey: "combinationId",
  as: "salesOrderItems",
});
SalesOrder.hasMany(OrderStatusHistory, {
  foreignKey: "salesOrderId",
  as: "salesOrderStatusHistory",
});

// ReturnTransactions & Items
ReturnTransaction.hasMany(ReturnItem, {
  foreignKey: "returnTransactionId",
  as: "returnItems",
});
ReturnItem.belongsTo(ReturnTransaction, {
  foreignKey: "returnTransactionId",
  as: "returnTransactions",
});
ReturnItem.belongsTo(ProductCombination, {
  foreignKey: "combinationId",
  as: "combination",
});
ReturnTransaction.belongsTo(GoodReceipt, {
  foreignKey: "referenceId",
  as: "goodReceipt",
  constraints: false,
});
ReturnTransaction.belongsTo(SalesOrder, {
  foreignKey: "referenceId",
  as: "salesOrder",
  constraints: false,
});
SalesOrder.hasMany(ReturnTransaction, {
  foreignKey: "referenceId",
  as: "returnTransactions",
  constraints: false,
});
GoodReceipt.hasMany(ReturnTransaction, {
  foreignKey: "referenceId",
  as: "returnTransactions",
  constraints: false,
});

// Invoices & Payments
Invoice.belongsTo(Supplier, { foreignKey: "supplierId", as: "supplier" });
Invoice.hasMany(InvoiceLine, { foreignKey: "invoiceId", as: "invoiceLines" });
Invoice.hasMany(PaymentApplication, {
  foreignKey: "invoiceId",
  as: "applications",
});
InvoiceLine.belongsTo(Invoice, { foreignKey: "invoiceId" });
InvoiceLine.belongsTo(GoodReceipt, {
  foreignKey: "goodReceiptId",
  as: "goodReceipt",
});

Payment.belongsTo(Supplier, { foreignKey: "supplierId", as: "supplier" });
Payment.belongsTo(User, { foreignKey: "changedBy", as: "user" });
Payment.hasMany(PaymentApplication, {
  foreignKey: "paymentId",
  as: "applications",
});
PaymentApplication.belongsTo(Payment, {
  foreignKey: "paymentId",
  as: "payment",
});
PaymentApplication.belongsTo(Invoice, {
  foreignKey: "invoiceId",
  as: "invoice",
});

// BreakPack & Stock Adjustments
BreakPack.belongsTo(User, { foreignKey: "createdBy", as: "user" });
BreakPack.belongsTo(ProductCombination, {
  foreignKey: "fromCombinationId",
  as: "fromCombination",
});
BreakPack.belongsTo(ProductCombination, {
  foreignKey: "toCombinationId",
  as: "toCombination",
});

StockAdjustment.belongsTo(User, { foreignKey: "createdBy", as: "user" });
StockAdjustment.belongsTo(ProductCombination, {
  foreignKey: "combinationId",
  as: "combination",
});

// Movements, Price History & Status History
InventoryMovement.belongsTo(User, { foreignKey: "userId", as: "user" });
InventoryMovement.belongsTo(ProductCombination, {
  foreignKey: "combinationId",
  as: "combination",
});
InventoryMovement.belongsTo(SalesOrder, {
  foreignKey: "referenceId",
  constraints: false,
  as: "salesOrder",
});
InventoryMovement.belongsTo(GoodReceipt, {
  foreignKey: "referenceId",
  constraints: false,
  as: "goodReceipt",
});

PriceHistory.belongsTo(ProductCombination, {
  foreignKey: "combinationId",
  as: "combination",
});
PriceHistory.belongsTo(User, { foreignKey: "changedBy", as: "user" });

OrderStatusHistory.belongsTo(GoodReceipt, {
  foreignKey: "goodReceiptId",
  as: "goodReceiptStatusHistory",
});
OrderStatusHistory.belongsTo(SalesOrder, {
  foreignKey: "salesOrderId",
  as: "salesOrderStatusHistory",
});
OrderStatusHistory.belongsTo(User, { foreignKey: "changedBy", as: "user" });

export {
  BreakPack,
  Category,
  CombinationValue,
  Customer,
  GoodReceipt,
  GoodReceiptLine,
  Inventory,
  InventoryMovement,
  Invoice,
  InvoiceLine,
  OrderStatusHistory,
  Payment,
  PaymentApplication,
  PriceHistory,
  Product,
  ProductCombination,
  ReturnItem,
  ReturnTransaction,
  SalesOrder,
  SalesOrderItem,
  sequelize,
  StockAdjustment,
  Supplier,
  User,
  VariantType,
  VariantValue,
};
