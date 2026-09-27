"use client";

import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";

const CommandDialog = dynamic(() => import("./CommandDialog").then((m) => m.CommandDialog), { ssr: false });

type Ctx = { open: (initial?: string) => void };
const CommandCtx = React.createContext<Ctx>({ open: () => {} });
export const useCommandPalette = () => React.useContext(CommandCtx);

/** ⌘K / Ctrl+K: jump to any page, action, customer or router. The dialog (cmdk) loads on first open. */
export function CommandProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [initial, setInitial] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setLoaded(true);
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ctx = React.useMemo<Ctx>(
    () => ({
      open: (q) => {
        setInitial(q ?? "");
        setLoaded(true);
        setOpen(true);
      },
    }),
    [],
  );

  return (
    <CommandCtx.Provider value={ctx}>
      {children}
      {loaded && <CommandDialog open={open} onOpenChange={setOpen} initial={initial} />}
    </CommandCtx.Provider>
  );
}

/** The search pill in the top bar; opens the palette. */
export function SearchButton() {
  const { open } = useCommandPalette();
  return (
    <button
      type="button"
      onClick={() => open()}
      className="hidden h-[46px] w-[300px] items-center gap-2.5 rounded-full bg-card px-4 text-sm text-muted-foreground shadow-soft transition hover:shadow-card active:scale-[0.99] lg:flex"
    >
      <Search aria-hidden size={17} />
      <span className="flex-grow text-left">Search</span>
      <kbd className="rounded-md bg-muted px-1.5 font-sans text-[11px] font-bold">⌘K</kbd>
    </button>
  );
}
