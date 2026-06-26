import { redirect } from "next/navigation";
import { todaySlug } from "@/lib/utils/date";

// /digest → redirect to today's digest
export default function DigestIndex() {
  redirect(`/digest/${todaySlug()}`);
}
