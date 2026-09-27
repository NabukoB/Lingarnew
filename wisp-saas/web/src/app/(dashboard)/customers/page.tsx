import { CustomersView } from "@/components/customers/CustomersView";
import { getPlans, getSubscribers, getTenant } from "@/lib/api";

export const metadata = { title: "Customers · Mtandao" };
export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [subscribers, tenant, plans] = await Promise.all([getSubscribers(), getTenant(), getPlans("pppoe")]);
  return <CustomersView subscribers={subscribers} paybill={tenant.shortcode} shortcodeType={tenant.shortcodeType} plans={plans} />;
}
