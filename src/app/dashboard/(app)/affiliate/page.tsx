import { loadOwnerStore } from "@/lib/owner-page";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AffiliateForm } from "@/components/dashboard/store-forms";

export default async function AffiliatePage() {
  const { store } = await loadOwnerStore();
  if (!store) return null;

  return (
    <>
      <PageHeader title="Affiliate IDs" description="Earn commission on your visitors' purchases" />
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <AffiliateForm store={store} />
        </CardContent>
      </Card>
    </>
  );
}
