"use server";

import { supplierServerService } from "@/server/services";
import { revalidatePath } from "next/cache";

export async function createSupplierAction(data: any) {
  const result = await supplierServerService.create(data);
  revalidatePath("/suppliers");
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

export async function updateSupplierAction(id: number, data: any) {
  const result = await supplierServerService.update(id, data);
  revalidatePath("/suppliers");
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

export async function deleteSupplierAction(id: number) {
  const result = await supplierServerService.delete(id);
  revalidatePath("/suppliers");
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

export async function getSuppliersAction() {
  const result = await supplierServerService.getAll();
  return result ? JSON.parse(JSON.stringify(result)) : [];
}
