import { loadOwnerStore } from "@/lib/owner-page";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogForm } from "@/components/dashboard/store-forms";
import { CollectionsForm } from "@/components/dashboard/collections-form";

export default async function CatalogPage() {
  const { store } = await loadOwnerStore();
  if (!store) return null;

  return (
    <>
      <PageHeader title="Products & sections" description="Choose what your store shows and in what order" />
      <div className="max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Your own categories</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <CollectionsForm store={store} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <CatalogForm store={store} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
