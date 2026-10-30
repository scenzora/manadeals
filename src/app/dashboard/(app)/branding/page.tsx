import { loadOwnerStore } from "@/lib/owner-page";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BrandingForm, ThemeForm } from "@/components/dashboard/store-forms";

export default async function BrandingPage() {
  const { store } = await loadOwnerStore();
  if (!store) return null;

  return (
    <>
      <PageHeader title="Branding" description="Name, logo and look of your store" />
      <div className="max-w-5xl space-y-6">
        <Card>
          <CardContent className="p-6">
            <BrandingForm store={store} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-sm font-semibold">Theme</h2>
            <ThemeForm store={store} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
