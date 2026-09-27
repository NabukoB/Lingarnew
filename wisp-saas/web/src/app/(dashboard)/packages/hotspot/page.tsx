import { PackagesView } from "@/components/packages/PackagesView";
import { getPlans } from "@/lib/api";

export const metadata = { title: "Hotspot packages · Mtandao" };
export const dynamic = "force-dynamic";

export default async function HotspotPackagesPage() {
  return <PackagesView kind="hotspot" plans={await getPlans("hotspot")} />;
}
