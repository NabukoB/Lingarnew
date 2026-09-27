import { PackagesView } from "@/components/packages/PackagesView";
import { getPlans } from "@/lib/api";

export const metadata = { title: "Packages · Mtandao" };
export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  return <PackagesView kind="pppoe" plans={await getPlans("pppoe")} />;
}
