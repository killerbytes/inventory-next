import { ROUTES, UserRole } from "@/constants";

/**
 * Granular system capability permissions.
 */
export const PERMISSIONS = {
  MANAGE_USERS: "MANAGE_USERS",
  VIEW_USERS: "VIEW_USERS",
  MANAGE_PRODUCTS: "MANAGE_PRODUCTS",
  VIEW_PRODUCTS: "VIEW_PRODUCTS",
  MANAGE_COMBINATIONS: "MANAGE_COMBINATIONS",
  MANAGE_PRICE: "MANAGE_PRICE",
  MANAGE_STOCK_ADJUSTMENTS: "MANAGE_STOCK_ADJUSTMENTS",
  MANAGE_BREAKPACKS: "MANAGE_BREAKPACKS",
  MANAGE_VARIANTS: "MANAGE_VARIANTS",
  MANAGE_CATEGORIES: "MANAGE_CATEGORIES",
  MANAGE_SUPPLIERS: "MANAGE_SUPPLIERS",
  MANAGE_CUSTOMERS: "MANAGE_CUSTOMERS",
  VIEW_GOODS: "VIEW_GOODS",
  MANAGE_GOODS: "MANAGE_GOODS",
  RETURN_GOODS: "RETURN_GOODS",
  CANCEL_GOODS: "CANCEL_GOODS",
  VIEW_SALES: "VIEW_SALES",
  MANAGE_SALES: "MANAGE_SALES",
  RETURN_EXCHANGE_SALES: "RETURN_EXCHANGE_SALES",
  CANCEL_SALES: "CANCEL_SALES",
  MANAGE_INVOICES: "MANAGE_INVOICES",
  MANAGE_PAYMENTS: "MANAGE_PAYMENTS",
  VIEW_REPORTS: "VIEW_REPORTS",
  MANAGE_SETTINGS: "MANAGE_SETTINGS",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Mapping of system roles to granted capability permissions.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_COMBINATIONS,
    PERMISSIONS.MANAGE_PRICE,
    PERMISSIONS.MANAGE_STOCK_ADJUSTMENTS,
    PERMISSIONS.MANAGE_BREAKPACKS,
    PERMISSIONS.MANAGE_VARIANTS,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.MANAGE_SUPPLIERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.VIEW_GOODS,
    PERMISSIONS.MANAGE_GOODS,
    PERMISSIONS.CANCEL_GOODS,
    PERMISSIONS.RETURN_GOODS,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.MANAGE_SALES,
    PERMISSIONS.RETURN_EXCHANGE_SALES,
    PERMISSIONS.CANCEL_SALES,
    PERMISSIONS.MANAGE_INVOICES,
    PERMISSIONS.MANAGE_PAYMENTS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_SETTINGS,
  ],
  [UserRole.MANAGER]: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_BREAKPACKS,
    PERMISSIONS.MANAGE_PRICE,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.MANAGE_SUPPLIERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.VIEW_GOODS,
    PERMISSIONS.MANAGE_GOODS,
    PERMISSIONS.RETURN_GOODS,
    PERMISSIONS.CANCEL_GOODS,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.MANAGE_SALES,
    PERMISSIONS.RETURN_EXCHANGE_SALES,
    PERMISSIONS.CANCEL_SALES,
    PERMISSIONS.MANAGE_INVOICES,
    PERMISSIONS.MANAGE_PAYMENTS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_SETTINGS,
  ],
  [UserRole.CASHIER]: [
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.VIEW_GOODS,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.MANAGE_SALES,
    PERMISSIONS.VIEW_REPORTS,
  ],
  [UserRole.USER]: [PERMISSIONS.VIEW_PRODUCTS],
};

/**
 * Validates whether a given user role possesses a specific permission.
 * Handles casing insensitivity to bridge PostgreSQL legacy strings and modern uppercase enums.
 */
export function hasPermission(
  role: string | undefined | null,
  permission: Permission,
): boolean {
  if (!role || typeof role !== "string") return false;

  const normalizedRole = role.trim().toUpperCase() as UserRole;
  const permissions = ROLE_PERMISSIONS[normalizedRole];

  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Landing pages in order of preference, each with the permission its page requires.
 * Keep each `permission` in sync with the `requirePermission` call in that page.
 */
export const HOME_ROUTE_CANDIDATES = [
  { route: ROUTES.DASHBOARD, permission: PERMISSIONS.VIEW_REPORTS },
  { route: ROUTES.SALES_ORDERS, permission: PERMISSIONS.VIEW_SALES },
  { route: ROUTES.GOOD_RECEIPT, permission: PERMISSIONS.VIEW_GOODS },
  { route: ROUTES.PRODUCTS, permission: PERMISSIONS.VIEW_PRODUCTS },
] as const;

/**
 * The first page `role` is allowed to open, used for `/` and after login.
 * Why: sending everyone to the dashboard looped (`/` → `/dashboard` → denied → `/`)
 * for roles without VIEW_REPORTS. A role with none of the candidates gets the
 * forbidden page, which requires only a session, so this can never loop.
 */
export function getHomeRoute(role: string | null | undefined): string {
  const candidate = HOME_ROUTE_CANDIDATES.find((c) =>
    hasPermission(role, c.permission),
  );
  return candidate ? candidate.route : ROUTES.FORBIDDEN;
}
