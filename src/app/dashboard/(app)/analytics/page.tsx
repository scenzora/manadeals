import { loadOwnerStore } from "@/lib/owner-page";
import { PageHeader } from "@/components/admin/page-header";
import { AnalyticsView } from "@/components/dashboard/analytics-view";

export default async function DashboardAnalyticsPage() {
  await loadOwnerStore();
  return (
    <>
      <PageHeader title="Analytics" description="Outbound clicks from your store" />
      <AnalyticsView />
    </>
  );
}
