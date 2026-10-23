import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage({ searchParams }: { searchParams: { expired?: string } }) {
  return <AdminLoginForm expired={searchParams.expired === "1"} />;
}
