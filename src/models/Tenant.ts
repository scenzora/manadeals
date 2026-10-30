import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

import { DEFAULT_THEME, THEME_FONTS } from "@/lib/tenant/theme";

/**
 * A white-label store. The theme is embedded rather than a separate collection:
 * it is always read together with the tenant and never queried on its own.
 */
const TenantSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    /** StoreOwner account (added with the dashboard in phase 3). */
    owner: { type: Types.ObjectId, ref: "StoreOwner", default: null, index: true },
    plan: { type: String, enum: ["free", "pro"], default: "free", index: true },
    status: { type: String, enum: ["draft", "active", "suspended"], default: "draft", index: true },
    suspendedReason: { type: String, default: "" },

    theme: {
      primary: { type: String, default: DEFAULT_THEME.primary },
      accent: { type: String, default: DEFAULT_THEME.accent },
      background: { type: String, default: DEFAULT_THEME.background },
      text: { type: String, default: DEFAULT_THEME.text },
      fontFamily: { type: String, enum: Object.keys(THEME_FONTS), default: DEFAULT_THEME.fontFamily },
      radius: { type: Number, default: DEFAULT_THEME.radius, min: 0, max: 24 },
      mode: { type: String, enum: ["light", "dark", "auto"], default: DEFAULT_THEME.mode },
    },

    /**
     * Affiliate ids. `select: false` keeps them out of every query unless the
     * caller asks with `+affiliate`, so they cannot leak into public payloads.
     */
    affiliate: {
      amazonAssociateTag: { type: String, default: "", select: false },
      flipkartAffiliateId: { type: String, default: "", select: false },
      generic: {
        type: [new Schema({ network: { type: String, required: true }, id: { type: String, required: true } }, { _id: false })],
        default: [],
        select: false,
      },
    },

    /** What the store shows from the shared catalogue. Empty categories = everything. */
    catalog: {
      categories: { type: [{ type: Types.ObjectId, ref: "Category" }], default: [] },
      dealOfTheDay: { type: Types.ObjectId, ref: "Product", default: null },
      /** Home page sections in display order. */
      sections: {
        type: [
          new Schema(
            { key: { type: String, required: true }, enabled: { type: Boolean, default: true } },
            { _id: false },
          ),
        ],
        default: [],
      },
    },

    branding: {
      logoUrl: { type: String, default: "" },
      faviconUrl: { type: String, default: "" },
      tagline: { type: String, default: "", maxlength: 160 },
      footerText: { type: String, default: "", maxlength: 500 },
      contactEmail: { type: String, default: "" },
      social: {
        facebook: { type: String, default: "" },
        instagram: { type: String, default: "" },
        x: { type: String, default: "" },
        youtube: { type: String, default: "" },
        telegram: { type: String, default: "" },
        whatsapp: { type: String, default: "" },
      },
    },
  },
  { timestamps: true },
);

export type TenantDoc = InferSchemaType<typeof TenantSchema>;

export const Tenant: Model<TenantDoc> =
  (models.Tenant as Model<TenantDoc>) || model<TenantDoc>("Tenant", TenantSchema);
export default Tenant;
