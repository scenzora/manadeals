import { notFound } from "next/navigation";
import mongoose from "mongoose";

import connectToDatabase from "@/lib/mongodb";
import { loadOwnerStore } from "@/lib/owner-page";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Invoice } from "@/models/Invoice";
import { PrintButton } from "@/components/dashboard/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice" };

const money = (paise: number) => formatCurrency(paise / 100);

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = await loadOwnerStore();
  if (!store || !mongoose.isValidObjectId(id)) notFound();

  await connectToDatabase();
  // Scoped by tenant: an owner can only ever open their own store's invoices.
  const invoice = await Invoice.findOne({ _id: id, tenant: store.id }).lean();
  if (!invoice) notFound();

  const seller = {
    name: process.env.BILLING_SELLER_NAME || "ManaDeals",
    address: process.env.BILLING_SELLER_ADDRESS || "",
    gstin: process.env.BILLING_SELLER_GSTIN || "",
    email: process.env.BILLING_SELLER_EMAIL || "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <PrintButton />
      </div>

      <article className="rounded-xl border border-[var(--border)] bg-white p-8 text-sm text-black print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-2xl font-semibold">{seller.name}</h1>
            {seller.address ? <p className="mt-1 max-w-xs whitespace-pre-line text-gray-600">{seller.address}</p> : null}
            {seller.gstin ? <p className="mt-1 text-gray-600">GSTIN: {seller.gstin}</p> : null}
            {seller.email ? <p className="text-gray-600">{seller.email}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold tracking-wide">{invoice.taxRate ? "TAX INVOICE" : "INVOICE"}</p>
            <p className="mt-1 text-gray-600">No: {invoice.number}</p>
            <p className="text-gray-600">Date: {formatDate(invoice.paidAt)}</p>
            <p className="mt-2 inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">PAID</p>
          </div>
        </header>

        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Billed to</p>
            <p className="mt-1 font-medium">{invoice.billTo?.name}</p>
            <p className="text-gray-600">{invoice.billTo?.email}</p>
            <p className="text-gray-600">Store: {invoice.billTo?.store}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment</p>
            <p className="mt-1 text-gray-600">Online (Razorpay)</p>
            <p className="break-all text-gray-600">Ref: {invoice.razorpayPaymentId}</p>
          </div>
        </section>

        <table className="w-full">
          <thead>
            <tr className="border-y border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3">
                <p className="font-medium">{invoice.description}</p>
                <p className="text-gray-600">
                  Service period: {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
                </p>
              </td>
              <td className="py-3 text-right">{money(invoice.subtotal)}</td>
            </tr>
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-full max-w-xs space-y-1.5">
          {invoice.tax > 0 ? (
            <>
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{money(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST ({invoice.taxRate}%)</span>
                <span>{money(invoice.tax)}</span>
              </div>
            </>
          ) : null}
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold">
            <span>Total paid</span>
            <span>{money(invoice.total)}</span>
          </div>
        </div>

        <p className="mt-10 text-xs text-gray-500">
          This is a computer-generated invoice and does not require a signature. Thank you for choosing {seller.name}.
        </p>
      </article>
    </div>
  );
}
