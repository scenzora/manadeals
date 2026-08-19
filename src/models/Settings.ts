import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Single-document settings store. `key` is always "global" so the document can
 * be fetched and upserted without tracking an id.
 */
const SettingsSchema = new Schema(
  {
    key: { type: String, default: "global", unique: true },

    general: {
      siteName: { type: String, default: "ManaDeals.online" },
      tagline: { type: String, default: "" },
      logo: { type: String, default: "/logo.png" },
      favicon: { type: String, default: "/favicon.ico" },
      contactEmail: { type: String, default: "" },
      supportPhone: { type: String, default: "" },
      address: { type: String, default: "" },
      social: {
        facebook: { type: String, default: "" },
        instagram: { type: String, default: "" },
        twitter: { type: String, default: "" },
        youtube: { type: String, default: "" },
        telegram: { type: String, default: "" },
        whatsapp: { type: String, default: "" },
      },
    },

    affiliate: {
      defaultNetwork: { type: String, default: "" },
      redirectDelaySeconds: { type: Number, default: 0 },
      openInNewTab: { type: Boolean, default: true },
      nofollow: { type: Boolean, default: true },
      disclosureText: { type: String, default: "" },
      trackClicks: { type: Boolean, default: true },
    },

    seo: {
      title: { type: String, default: "ManaDeals.online" },
      description: { type: String, default: "" },
      keywords: { type: [String], default: [] },
      ogImage: { type: String, default: "" },
      twitterHandle: { type: String, default: "" },
      twitterCard: { type: String, default: "summary_large_image" },
      canonicalUrl: { type: String, default: "" },
      robots: { type: String, default: "index, follow" },
      sitemapEnabled: { type: Boolean, default: true },
      googleAnalyticsId: { type: String, default: "" },
      googleSiteVerification: { type: String, default: "" },
    },

    email: {
      smtpHost: { type: String, default: "" },
      smtpPort: { type: Number, default: 587 },
      smtpUser: { type: String, default: "" },
      smtpPassword: { type: String, default: "", select: false },
      fromName: { type: String, default: "ManaDeals" },
      fromEmail: { type: String, default: "" },
      secure: { type: Boolean, default: false },
    },

    system: {
      maintenanceMode: { type: Boolean, default: false },
      maintenanceMessage: { type: String, default: "" },
      cacheEnabled: { type: Boolean, default: true },
      cacheTtlSeconds: { type: Number, default: 300 },
      paginationSize: { type: Number, default: 20, min: 5, max: 100 },
    },
  },
  { timestamps: true },
);

export type SettingsDoc = InferSchemaType<typeof SettingsSchema>;

export const Settings: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) || model<SettingsDoc>("Settings", SettingsSchema);
export default Settings;
