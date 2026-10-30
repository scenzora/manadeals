import { loadOwnerStore } from "@/lib/owner-page";
import { PageHeader } from "@/components/admin/page-header";
import { BlogManager } from "@/components/dashboard/blog-manager";

export default async function DashboardBlogPage() {
  await loadOwnerStore();
  return (
    <>
      <PageHeader title="Blog" description="Original articles help your store rank. Markdown is supported." />
      <BlogManager />
    </>
  );
}
