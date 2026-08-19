/**
 * Importing this barrel registers every schema with Mongoose, which matters for
 * `populate()` calls that reference a model the current route never imported.
 */
export { default as ActivityLog } from "./ActivityLog";
export { default as AdminUser } from "./AdminUser";
export { default as AffiliateNetwork } from "./AffiliateNetwork";
export { default as Banner } from "./Banner";
export { default as BlogPost } from "./BlogPost";
export { default as Brand } from "./Brand";
export { default as Category } from "./Category";
export { default as Click } from "./Click";
export { default as Coupon } from "./Coupon";
export { default as Deal } from "./Deal";
export { default as Notification } from "./Notification";
export { default as PriceHistory } from "./PriceHistory";
export { default as Product } from "./Product";
export { default as ProductReview } from "./ProductReview";
export { default as ProductView } from "./ProductView";
export { default as Role } from "./Role";
export { default as Settings } from "./Settings";
export { default as User } from "./User";
export { default as WikiPage } from "./WikiPage";
