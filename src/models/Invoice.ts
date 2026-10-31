import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

/** One attempt to buy a Pro term. Created before checkout, settled by verify or webhook. */
const BillingOrderSchema = new Schema(
  {
    tenant: { type: Types.ObjectId, ref: "Tenant", required: true, index: true },
    owner: { type: Types.ObjectId, ref: "StoreOwner", required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["created", "paid", "failed"], default: "created", index: true },
    razorpayPaymentId: { type: String, default: "" },
  },
  { timestamps: true },
);

/** Immutable record of a successful payment. Party details are snapshotted at purchase. */
const InvoiceSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    tenant: { type: Types.ObjectId, ref: "Tenant", required: true, index: true },
    order: { type: Types.ObjectId, ref: "BillingOrder", required: true, unique: true },
    razorpayPaymentId: { type: String, required: true },
    description: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    subtotal: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    billTo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      store: { type: String, required: true },
    },
    paidAt: { type: Date, required: true },
  },
  { timestamps: true },
);

/** Gap-free sequence per financial counter (invoice numbers must not skip). */
const CounterSchema = new Schema({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } });

export type BillingOrderDoc = InferSchemaType<typeof BillingOrderSchema>;
export type InvoiceDoc = InferSchemaType<typeof InvoiceSchema>;

export const BillingOrder: Model<BillingOrderDoc> =
  (models.BillingOrder as Model<BillingOrderDoc>) || model<BillingOrderDoc>("BillingOrder", BillingOrderSchema);
export const Invoice: Model<InvoiceDoc> =
  (models.Invoice as Model<InvoiceDoc>) || model<InvoiceDoc>("Invoice", InvoiceSchema);
export const Counter: Model<{ _id: string; seq: number }> =
  (models.Counter as Model<{ _id: string; seq: number }>) || model("Counter", CounterSchema);
