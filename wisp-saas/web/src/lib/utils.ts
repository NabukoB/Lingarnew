import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Knows our custom radius/shadow tokens, so cn("rounded-card", "rounded-xl") keeps the last one.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: [{ rounded: ["card", "tile"] }],
      shadow: [{ shadow: ["card", "soft", "float", "brand"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
