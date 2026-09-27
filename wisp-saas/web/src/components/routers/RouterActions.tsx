"use client";

import { RefreshCw, TerminalSquare, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/sonner";
import { deleteRouter, syncRouter } from "@/lib/actions";

export function RouterActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        loading={busy === "sync"}
        onClick={async () => {
          setBusy("sync");
          const r = await syncRouter(id);
          setBusy(null);
          if (!r.ok) return toast.error(r.error);
          toast.success(r.data ? `Fixed ${r.data} setting${r.data > 1 ? "s" : ""}` : "All in sync");
          router.refresh();
        }}
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Sync
      </Button>
      <Button variant="secondary" onClick={() => router.push(`/routers/${id}?setup=1`)}>
        <TerminalSquare aria-hidden className="h-4 w-4" />
        New setup command
      </Button>
      <Button variant="destructive" onClick={() => setConfirm(true)}>
        <Trash2 aria-hidden className="h-4 w-4" />
        Remove
      </Button>
      <Modal open={confirm} onOpenChange={setConfirm} title={`Remove ${name}?`} description="Its customers can't log in until it is added again.">
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" size="lg" onClick={() => setConfirm(false)}>
            Keep
          </Button>
          <Button
            size="lg"
            className="bg-destructive shadow-none hover:bg-destructive/90"
            loading={busy === "del"}
            onClick={async () => {
              setBusy("del");
              const r = await deleteRouter(id);
              setBusy(null);
              if (!r.ok) return toast.error(r.error);
              toast.success(`${name} removed`);
              router.push("/network");
            }}
          >
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
}
