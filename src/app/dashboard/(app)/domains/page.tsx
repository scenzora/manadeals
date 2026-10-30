import { loadOwnerStore } from "@/lib/owner-page";
import { PageHeader } from "@/components/admin/page-header";
import { DomainsManager } from "@/components/dashboard/domains-manager";

export default async function DomainsPage() {
  await loadOwnerStore();
  return (
    <>
      <PageHeader title="Domains" description="Use your own domain for your store" />
      <DomainsManager />
    </>
  );
}
