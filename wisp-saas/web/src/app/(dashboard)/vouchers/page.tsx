import { VouchersView } from "@/components/vouchers/VouchersView";
import { getPlans, getTenant, getVouchers } from "@/lib/api";

export const metadata = { title: "Vouchers · Mtandao" };
export const dynamic = "force-dynamic";

export default async function VouchersPage() {
  const [vouchers, plans, tenant] = await Promise.all([getVouchers(), getPlans("hotspot"), getTenant()]);
  return <VouchersView vouchers={vouchers} plans={plans.filter((p) => p.isActive)} business={tenant.name} />;
}
