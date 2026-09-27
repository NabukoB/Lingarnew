import { SmsSettings } from "@/components/settings/SmsSettings";
import { SettingsTabs } from "@/components/settings/common";
import { getSettings } from "@/lib/api";

export const metadata = { title: "Settings · Mtandao" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const tenant = await getSettings();
  return (
    <>
      <SettingsTabs />
      {tenant ? <SmsSettings tenant={tenant} /> : <p className="py-12 text-center text-sm font-semibold text-muted-foreground">Connect the API to edit settings</p>}
    </>
  );
}
