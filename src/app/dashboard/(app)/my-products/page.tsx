import { loadOwnerStore } from "@/lib/owner-page";
import { PageHeader } from "@/components/admin/page-header";
import { ProductsManager } from "@/components/dashboard/products-manager";

export default async function MyProductsPage() {
  await loadOwnerStore();
  return (
    <>
      <PageHeader title="My products" description="Add your own products with your own affiliate links" />
      <ProductsManager />
    </>
  );
}
