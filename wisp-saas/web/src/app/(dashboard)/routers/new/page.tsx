import { ConnectRouter } from "@/components/routers/ConnectRouter";
import { getLocations } from "@/lib/api";

export const metadata = { title: "Add router · Mtandao" };
export const dynamic = "force-dynamic";

export default async function AddRouterPage() {
  const locations = await getLocations();
  return <ConnectRouter locations={locations} />;
}
