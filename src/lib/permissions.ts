/**
 * Central permission registry. Roles are stored in MongoDB (Role model) so they
 * stay configurable, but the list of valid permission keys lives here so the UI
 * and the API validate against exactly the same source of truth.
 */
export const PERMISSION_GROUPS = {
  Products: ["products.view", "products.create", "products.edit", "products.delete"],
  Categories: ["categories.view", "categories.create", "categories.edit", "categories.delete"],
  Brands: ["brands.view", "brands.create", "brands.edit", "brands.delete"],
  "Affiliate Networks": [
    "affiliate-networks.view",
    "affiliate-networks.create",
    "affiliate-networks.edit",
    "affiliate-networks.delete",
  ],
  Deals: ["deals.view", "deals.create", "deals.edit", "deals.delete"],
  Coupons: ["coupons.view", "coupons.create", "coupons.edit", "coupons.delete"],
  "Price Tracking": ["price-tracking.view", "price-tracking.manage"],
  Analytics: ["analytics.view"],
  Users: ["users.view", "users.edit", "users.delete"],
  Banners: ["banners.view", "banners.create", "banners.edit", "banners.delete"],
  Blog: ["blog.view", "blog.create", "blog.edit", "blog.delete", "blog.publish"],
  Wiki: ["wiki.view", "wiki.create", "wiki.edit", "wiki.delete"],
  SEO: ["seo.view", "seo.manage"],
  Notifications: ["notifications.view", "notifications.manage"],
  Settings: ["settings.view", "settings.manage"],
  "Activity Logs": ["activity-logs.view"],
  Administration: ["admins.view", "admins.manage", "roles.manage"],
} as const;

export const ALL_PERMISSIONS: string[] = Object.values(PERMISSION_GROUPS).flat();

export type Permission = (typeof ALL_PERMISSIONS)[number];

export const ROLE_SLUGS = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  EDITOR: "editor",
  CONTENT_MANAGER: "content-manager",
  ANALYST: "analyst",
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];

const viewOnly = (keys: string[]) => keys.filter((key) => key.endsWith(".view"));

/** Default permission sets applied by the seed script for each built-in role. */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleSlug, string[]> = {
  [ROLE_SLUGS.SUPER_ADMIN]: [...ALL_PERMISSIONS],
  [ROLE_SLUGS.ADMIN]: ALL_PERMISSIONS.filter(
    (permission) => !["admins.manage", "roles.manage"].includes(permission),
  ),
  [ROLE_SLUGS.EDITOR]: [
    ...PERMISSION_GROUPS.Products,
    ...PERMISSION_GROUPS.Categories,
    ...PERMISSION_GROUPS.Brands,
    ...PERMISSION_GROUPS.Deals,
    ...PERMISSION_GROUPS.Coupons,
    ...PERMISSION_GROUPS["Price Tracking"],
    ...PERMISSION_GROUPS.Wiki,
    "analytics.view",
    "seo.view",
  ].filter((permission) => !permission.endsWith(".delete")),
  [ROLE_SLUGS.CONTENT_MANAGER]: [
    ...PERMISSION_GROUPS.Blog,
    ...PERMISSION_GROUPS.Wiki,
    ...PERMISSION_GROUPS.Banners,
    ...PERMISSION_GROUPS.SEO,
    "products.view",
    "categories.view",
    "brands.view",
  ],
  [ROLE_SLUGS.ANALYST]: [
    ...viewOnly(ALL_PERMISSIONS).filter(
      (permission) => !permission.startsWith("admins.") && !permission.startsWith("settings."),
    ),
    "analytics.view",
  ],
};

export const BUILT_IN_ROLES: { slug: RoleSlug; name: string; description: string }[] = [
  { slug: ROLE_SLUGS.SUPER_ADMIN, name: "Super Admin", description: "Unrestricted access to every module." },
  { slug: ROLE_SLUGS.ADMIN, name: "Admin", description: "Full platform access except admin & role management." },
  { slug: ROLE_SLUGS.EDITOR, name: "Editor", description: "Manages catalogue: products, deals, coupons." },
  { slug: ROLE_SLUGS.CONTENT_MANAGER, name: "Content Manager", description: "Manages blog, banners and SEO." },
  { slug: ROLE_SLUGS.ANALYST, name: "Analyst", description: "Read-only access focused on analytics." },
];

export function hasPermission(
  session: { isSuperAdmin?: boolean; permissions?: string[] } | null | undefined,
  permission: string,
) {
  if (!session) return false;
  if (session.isSuperAdmin) return true;
  return (session.permissions ?? []).includes(permission);
}

export function hasAnyPermission(
  session: { isSuperAdmin?: boolean; permissions?: string[] } | null | undefined,
  permissions: string[],
) {
  return permissions.some((permission) => hasPermission(session, permission));
}
