// Fixture for actionResultAnalyzer.test.ts; mirrors the shape of real actions.
import type { ActionResult } from "@/types";

export declare function saveThingAction(input: { name: string }): Promise<ActionResult<{ id: number }>>;
export declare function listThingsAction(): Promise<ActionResult<{ id: number }[]>>;

/** Not an ActionResult: a plain helper exported from an actions file. */
export declare function plainHelper(): Promise<number>;

export const createProtectedAction = <T,>(c: T) => c;
export const protectedOne = createProtectedAction({});
export const unprotected = async () => 1;
export async function unprotectedFn() {
  return 1;
}
export async function allowedFn() {
  return 1;
}
