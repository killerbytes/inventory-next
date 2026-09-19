"use server";

import { customerServerService } from "@/server/services";
import { revalidatePath } from "next/cache";

export async function createCustomerAction(data: any) {
  const result = await customerServerService.create(data);
  revalidatePath("/customers");
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

export async function updateCustomerAction(id: number, data: any) {
  const result = await customerServerService.update(id, data);
  revalidatePath("/customers");
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

export async function deleteCustomerAction(id: number) {
  const result = await customerServerService.delete(id);
  revalidatePath("/customers");
  return result ? JSON.parse(JSON.stringify(result)) : null;
}
