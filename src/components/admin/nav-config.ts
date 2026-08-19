import {
  BadgePercent,
  BarChart3,
  Bell,
  BookOpen,
  BookMarked,
  Building2,
  FileClock,
  Flame,
  Globe,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  ListTree,
  MessageSquareText,
  Package,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Any one of these permissions grants access to the menu entry. */
  permissions: string[];
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, permissions: [] },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3, permissions: ["analytics.view"] },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { label: "Products", href: "/admin/products", icon: Package, permissions: ["products.view"] },
      { label: "Categories", href: "/admin/categories", icon: ListTree, permissions: ["categories.view"] },
      { label: "Brands", href: "/admin/brands", icon: Building2, permissions: ["brands.view"] },
      {
        label: "Reviews",
        href: "/admin/reviews",
        icon: MessageSquareText,
        permissions: ["products.view"],
      },
      {
        label: "Price Tracking",
        href: "/admin/price-tracking",
        icon: TrendingUp,
        permissions: ["price-tracking.view"],
      },
    ],
  },
  {
    title: "Offers",
    items: [
      { label: "Deals", href: "/admin/deals", icon: Flame, permissions: ["deals.view"] },
      { label: "Coupons", href: "/admin/coupons", icon: BadgePercent, permissions: ["coupons.view"] },
      {
        label: "Affiliate Networks",
        href: "/admin/affiliate-networks",
        icon: Link2,
        permissions: ["affiliate-networks.view"],
      },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Banners", href: "/admin/banners", icon: ImageIcon, permissions: ["banners.view"] },
      { label: "Blog", href: "/admin/blog", icon: BookOpen, permissions: ["blog.view"] },
      { label: "SEO", href: "/admin/seo", icon: Globe, permissions: ["seo.view"] },
      { label: "Wiki", href: "/admin/wiki", icon: BookMarked, permissions: ["wiki.view"] },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Users", href: "/admin/users", icon: Users, permissions: ["users.view"] },
      {
        label: "Admins & Roles",
        href: "/admin/admin-users",
        icon: ShieldCheck,
        permissions: ["admins.view", "admins.manage"],
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Notifications",
        href: "/admin/notifications",
        icon: Bell,
        permissions: ["notifications.view"],
      },
      { label: "Settings", href: "/admin/settings", icon: Settings, permissions: ["settings.view"] },
      {
        label: "Activity Logs",
        href: "/admin/activity-logs",
        icon: FileClock,
        permissions: ["activity-logs.view"],
      },
    ],
  },
];
