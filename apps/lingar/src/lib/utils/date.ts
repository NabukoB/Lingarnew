import { format, parseISO } from "date-fns";

export function todaySlug(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatDigestDate(slug: string): string {
  return format(parseISO(slug), "EEEE, MMMM d, yyyy");
}

export function formatShortDate(isoDate: string): string {
  return format(parseISO(isoDate), "MMM d");
}
