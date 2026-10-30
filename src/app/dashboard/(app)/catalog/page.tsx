import { loadOwnerStore } from "@/lib/owner-page";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CatalogForm } from "@/components/dashboard/store-forms";

export default async function CatalogPage() {
  const { store } = await loadOwnerStore();
  if (!store) return null;

  return (
    <>
      <PageHeader title="Products & sections" description="Choose what your store shows and in what order" />
      <Card className="max-w-3xl">
        <CardContent className="p-6">
          <CatalogForm store={store} />
        </CardContent>
      </Card>
    </>
  );
}
