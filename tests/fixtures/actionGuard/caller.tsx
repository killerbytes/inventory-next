// Fixture for actionResultAnalyzer.test.ts. Each line ending in `// expect Rn`
// must be reported with that rule; every other action call must not be.
import { listThingsAction, plainHelper, saveThingAction } from "./fake.actions";

declare const toast: { error: (m: string) => void; success: (m: string) => void };
declare const flag: boolean;

export async function discarded() {
  await saveThingAction({ name: "a" }); // expect R1
  saveThingAction({ name: "a" }); // expect R1
  void saveThingAction({ name: "a" }); // expect R1
  saveThingAction({ name: "a" }).catch(() => {}); // expect R1
  await plainHelper();
}

export async function unchecked() {
  const res = await saveThingAction({ name: "a" }); // expect R2
  toast.success(String(res));
  const id = JSON.stringify(await saveThingAction({ name: "a" })); // expect R2
  listThingsAction().then((r) => r); // expect R2
  return id;
}

export async function typedAny() {
  const res: any = await saveThingAction({ name: "a" }); // expect R3
  listThingsAction().then((data: any) => data); // expect R3
  const cast = (await saveThingAction({ name: "a" })) as any; // expect R3
  return [res, cast];
}

export async function handled() {
  const res = await saveThingAction({ name: "a" });
  if (!res.success) return toast.error(res.error);

  const picked = flag
    ? await saveThingAction({ name: "a" })
    : await saveThingAction({ name: "b" });
  if (picked && !picked.success) return;

  listThingsAction().then((r) => {
    if (r.success) toast.success(String(r.data.length));
  });
  listThingsAction().then(({ success }) => success);

  const ok = (await saveThingAction({ name: "a" })).success;
  return ok;
}

export function passedUp() {
  return saveThingAction({ name: "a" });
}
export const passedUpArrow = () => saveThingAction({ name: "a" });
