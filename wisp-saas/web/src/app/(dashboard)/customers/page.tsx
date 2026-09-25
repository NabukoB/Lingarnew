import { CustomersView } from "@/components/customers/CustomersView";
import { getSubscribers, getTenant } from "@/lib/api";

export const metadata = { title: "Customers · Mtandao" };

export default async function CustomersPage() {
  const [subscribers, tenant] = await Promise.all([getSubscribers(), getTenant()]);
  return <CustomersView subscribers={subscribers} paybill={tenant.shortcode} />;
}
