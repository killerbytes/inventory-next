import {
  Category,
  Customer,
  GoodReceipt,
  Product,
  Supplier,
  User,
  VariantType,
} from "@/server/models";
import { categoryServerService } from "@/server/services/categoryServer.service";
import { customerServerService } from "@/server/services/customerServer.service";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { invoiceServerService } from "@/server/services/invoiceServer.service";
import { productCombinationServerService } from "@/server/services/productCombinationServer.service";
import { productServerService } from "@/server/services/productServer.service";
import { supplierServerService } from "@/server/services/supplierServer.service";
import { userServerService } from "@/server/services/userServer.service";
import { variantTypeServerService } from "@/server/services/variantTypeServer.service";

export const categories = [
  {
    name: "Tools",
    description: "Hardware tools",
    order: 1,
  },
  {
    name: "Electronics",
    description: "Electronics",
    order: 2,
  },
];

export const products = [
  {
    name: "Shovel",
    description: "Shovel BOX",
    baseUnit: "BOX",
    categoryId: 1,
  },
  {
    name: "Wire",
    description: "Wire",
    baseUnit: "PCS",
    categoryId: 2,
  },
  {
    name: "Shovel",
    description: "Shovel PCS",
    baseUnit: "PCS",
    categoryId: 1,
  },
];

export const variantTypes = [
  {
    name: "Colors",
    productId: 1,
    values: [{ value: "Red" }, { value: "Blue" }],
  },
  {
    name: "Size",
    productId: 1,
    values: [{ value: "Small" }, { value: "Medium" }],
  },
  {
    name: "AMP",
    productId: 1,
    values: [{ value: "10A" }, { value: "20A" }],
  },
  {
    name: "AMP",
    productId: 2,
    values: [{ value: "10A" }, { value: "20A" }],
  },
];

export const combinations = [
  {
    name: "Shovel - Red",
    price: 100,
    unit: "BOX",
    reorderLevel: 1,
    conversionFactor: 24,
    values: [
      {
        value: "Red",
        variantTypeId: 1,
      },
    ],
  },
  {
    name: "Shovel - Red PCS",
    price: 100,
    unit: "PCS",
    reorderLevel: 1,
    conversionFactor: 1,
    isBreakPackOfId: 1,
    values: [
      {
        value: "Red",
        variantTypeId: 1,
      },
    ],
  },
];

export const suppliers = [
  {
    name: "Alice Supplier",
    email: "alice_supp@test.com",
    phone: "1234567890",
    address: "123 Main St",
    notes: "This is a note",
    isActive: true,
  },
  {
    name: "Charlie Supplier",
    email: "charlie_supp@test.com",
    phone: "546545434",
    address: "432 Main St",
    notes: "This is a note",
    isActive: true,
  },
];

export const customers = [
  {
    name: "Alice Customer",
    email: "alice_cust@test.com",
    phone: "1234567890",
    address: "123 Main St",
  },
  {
    name: "Charlie Customer",
    email: "charlie_cust@test.com",
    phone: "546545434",
    address: "432 Main St",
  },
];

export const users = [
  {
    name: "Alice",
    email: "alice@test.com",
    username: "alice",
    password: "hashedpassword123",
    role: "ADMIN",
  },
  {
    name: "Charlie",
    email: "charlie@test.com",
    username: "charlie",
    password: "hashedpassword123",
    role: "USER",
  },
];

export const stockAdjustments = [
  {
    combinationId: 1,
    newQuantity: 11,
    reason: "SUPPLIER_BONUS",
    notes: "test",
  },
  {
    combinationId: 2,
    newQuantity: 20,
    reason: "SAMPLE",
    notes: "test",
  },
];

export const goodReceipts = [
  {
    supplierId: 1,
    receiptDate: new Date(),
    referenceNo: "REF1",
    internalNotes: "Test Internal Notes",
    goodReceiptLines: [
      {
        combinationId: 1,
        quantity: 10,
        purchasePrice: 100,
      },
      {
        combinationId: 2,
        quantity: 20,
        discount: 10,
        purchasePrice: 100,
      },
    ],
  },
  {
    supplierId: 1,
    receiptDate: new Date(),
    referenceNo: "REF2",
    internalNotes: "Test Internal Notes",
    goodReceiptLines: [
      {
        combinationId: 1,
        quantity: 10,
        purchasePrice: 100,
      },
      {
        combinationId: 2,
        quantity: 20,
        discount: 10,
        purchasePrice: 100,
      },
    ],
  },
  {
    supplierId: 1,
    receiptDate: new Date(),
    referenceNo: "REF3",
    internalNotes: "Test Internal Notes",
    goodReceiptLines: [
      {
        combinationId: 1,
        quantity: 10,
        purchasePrice: 100,
      },
      {
        combinationId: 2,
        quantity: 20,
        discount: 10,
        purchasePrice: 100,
      },
    ],
  },
  {
    supplierId: 2,
    receiptDate: new Date(),
    referenceNo: "REF2222",
    internalNotes: "Supplier #2",
    goodReceiptLines: [
      {
        combinationId: 1,
        quantity: 10,
        purchasePrice: 100,
      },
      {
        combinationId: 2,
        quantity: 20,
        discount: 10,
        purchasePrice: 100,
      },
    ],
  },
];

export async function createCategory(index = 0): Promise<Category> {
  return await Category.create({ ...categories[index] });
}

export async function createUser(index = 0): Promise<User> {
  const payload = { ...users[index] };
  let user = await User.findOne({ where: { username: payload.username } });
  if (!user) {
    user = await User.create({
      name: payload.name,
      username: payload.username,
      email: payload.email,
      password: User.generateHash(payload.password),
      role: payload.role,
      isActive: true,
    });
  } else {
    await user.update({ isActive: true });
  }
  return user;
}

export async function createCustomer(index = 0): Promise<Customer> {
  return await Customer.create({ ...customers[index] });
}

export async function createProduct(index = 0): Promise<Product> {
  return await Product.create({ ...products[index] } as any);
}

export async function createVariantType(index = 0): Promise<VariantType> {
  return (await variantTypeServerService.create({
    ...variantTypes[index],
  })) as VariantType;
}

export async function createSupplier(index = 0): Promise<Supplier> {
  return await Supplier.create({ ...suppliers[index] });
}

export async function createCombination(
  payload: any = combinations,
  productId = 1,
  userId = 1
): Promise<any> {
  return await productCombinationServerService.updateByProductId(
    productId,
    payload,
    userId
  );
}

export async function createStockAdjustment(
  index: number,
  userId = 1
): Promise<any> {
  return await productCombinationServerService.stockAdjustment(
    {
      ...stockAdjustments[index],
    } as any,
    userId
  );
}

export async function createGoodReceipt(
  index: number,
  userId = 1
): Promise<any> {
  return await goodReceiptServerService.create(
    {
      ...goodReceipts[index],
    },
    userId
  );
}

export async function updateGoodReceiptStatus(
  id: number,
  userId = 1
): Promise<any> {
  return await goodReceiptServerService.update(
    id,
    {
      status: "RECEIVED",
    },
    userId
  );
}

export async function createUpdateGoodReceipt(
  goodReceiptLines = [
    {
      combinationId: 1,
      quantity: 10,
      purchasePrice: 100,
    },
    {
      combinationId: 2,
      quantity: 20,
      discount: 10,
      purchasePrice: 100,
    },
  ],
  userId = 1
): Promise<any> {
  const gr = await goodReceiptServerService.create(
    {
      supplierId: 1,
      receiptDate: new Date(),
      referenceNo: "Test Notes",
      internalNotes: "Test Internal Notes",
      goodReceiptLines,
    },
    userId
  );
  await goodReceiptServerService.update(
    gr.id,
    {
      status: "RECEIVED",
      goodReceiptLines,
    },
    userId
  );
  return gr;
}

export async function createInvoice(
  userId = 1,
  invoiceNumber = "TEST"
): Promise<any> {
  const lines = [
    {
      amount: 100,
      goodReceiptId: 1,
    },
    {
      amount: 200,
      goodReceiptId: 2,
    },
  ];

  return await invoiceServerService.create(
    {
      invoiceNumber,
      invoiceDate: new Date(),
      dueDate: new Date(),
      status: "DRAFT",
      supplierId: 1,
      invoiceLines: lines,
    },
    userId
  );
}

/**
 * Extract field names from Sequelize Unique / Constraint errors.
 */
export function getConstraintFields(err: any): string[] {
  if (!err || !err.fields) {
    if (err?.errors && Array.isArray(err.errors)) {
      return err.errors.map((e: any) => e.path).filter(Boolean);
    }
    return [];
  }
  return Array.isArray(err.fields) ? err.fields : Object.keys(err.fields);
}
