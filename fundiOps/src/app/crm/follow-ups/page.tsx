import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FollowUpRow } from "@/components/crm/FollowUpRow";
import { redirect } from "next/navigation";
import { isToday, isBefore, isAfter, startOfTomorrow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: followUps } = await supabase
    .from("crm_follow_ups")
    .select(
      "*, contact:wa_contacts(display_name, phone, business_name)"
    )
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("due_at", { ascending: true });

  const all = followUps ?? [];
  const now = new Date();
  const tomorrow = startOfTomorrow();

  const overdue = all.filter(
    (f) => isBefore(new Date(f.due_at), now) && !isToday(new Date(f.due_at))
  );
  const today = all.filter((f) => isToday(new Date(f.due_at)));
  const upcoming = all.filter((f) => isAfter(new Date(f.due_at), tomorrow));

  const Section = ({
    title,
    items,
    accent,
  }: {
    title: string;
    items: typeof all;
    accent?: boolean;
  }) => (
    <div className="mb-8">
      <h2
        className={`text-sm font-semibold mb-3 ${
          accent ? "text-red-400" : "text-fundiops-text"
        }`}
      >
        {title}{" "}
        <span className="text-fundiops-muted font-normal">({items.length})</span>
      </h2>
      <div className="space-y-3">
        {items.map((fu) => (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <FollowUpRow key={fu.id} followUp={fu as any} />
        ))}
        {items.length === 0 && (
          <p className="text-xs text-fundiops-muted py-4">None</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-fundiops-text mb-6">Follow-ups</h1>
      <Section title="Overdue" items={overdue} accent />
      <Section title="Today" items={today} />
      <Section title="Upcoming" items={upcoming} />
    </div>
  );
}
