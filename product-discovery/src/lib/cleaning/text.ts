function trimCollapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => (word.length === 0 ? word : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join(" ");
}

export function cleanTitle(raw: string): { display: string; search: string } {
  const collapsed = trimCollapseWhitespace(raw);
  const display = toTitleCase(collapsed);
  const search = display.toLowerCase();
  return { display, search };
}
