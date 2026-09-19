import UsersClientWidget from "@/components/widgets/UsersClientWidget";
import { userServerService } from "@/server/services/userServer.service";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requirePermission(PERMISSIONS.VIEW_USERS);

  let users: any[] = [];
  try {
    const result = await userServerService.getAll();
    users = result || [];
  } catch (err) {
    console.error("Error fetching users on server:", err);
    users = [];
  }

  return <UsersClientWidget initialUsers={JSON.parse(JSON.stringify(users))} />;
}
