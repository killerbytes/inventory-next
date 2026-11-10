import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/constants";
import { getHomeRoute } from "@/lib/rbac";
import { requireSession } from "@/server/auth/guards";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Access Denied | Inventory System",
  description: "You don't have permission to view this page.",
};

/**
 * Where permission guards send users. It needs only a session (never a permission),
 * so redirecting here can't loop.
 */
export default async function ForbiddenPage() {
  const session = await requireSession();
  const home = getHomeRoute(session.role);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">You don&apos;t have access</CardTitle>
          <CardDescription className="text-sm">
            Your account doesn&apos;t have permission to view that page. Ask an
            administrator if you need access.
          </CardDescription>
        </CardHeader>
        {/* No home link when even the home route is forbidden, or it would link back here. */}
        {home !== ROUTES.FORBIDDEN && (
          <CardContent className="flex justify-center pt-2">
            <Link href={home} className={buttonVariants()}>
              Go to my home page
            </Link>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
