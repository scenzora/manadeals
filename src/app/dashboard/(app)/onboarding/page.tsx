import { loadOwnerStore } from "@/lib/owner-page";
import { ROOT_DOMAIN } from "@/lib/tenant/host";
import { PageHeader } from "@/components/admin/page-header";
import { OnboardingWizard } from "@/components/dashboard/onboarding-wizard";

export default async function OnboardingPage() {
  const { store } = await loadOwnerStore({ allowNoStore: true });
  return (
    <>
      <PageHeader title="Set up your store" description="Six quick steps. Everything can be changed later." />
      <OnboardingWizard store={store} rootDomain={ROOT_DOMAIN} />
    </>
  );
}
