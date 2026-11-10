import { getHomeRoute } from "@/lib/rbac";
import { requireSession } from "@/server/auth/guards";
import { redirect } from "next/navigation";

/** Sends each user to the first page their role can open (see `getHomeRoute`). */
export default async function HomePage() {
  const session = await requireSession();
  redirect(getHomeRoute(session.role));
}
