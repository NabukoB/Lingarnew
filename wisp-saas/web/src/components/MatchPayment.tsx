"use client";

import { Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/sonner";
import { matchPayment } from "@/lib/actions";

/** Assigns an unmatched Paybill payment to a customer's account ID. */
export function MatchPayment({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="transition active:scale-95">
        <Badge variant="warning" className="h-7 px-3 text-xs">
          <Link2 aria-hidden className="h-3.5 w-3.5" /> Match
        </Badge>
      </button>
      <Modal open={open} onOpenChange={setOpen} title="Match payment">
        <form
          className="flex flex-col gap-3.5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const r = await matchPayment(id, account);
            setBusy(false);
            if (!r.ok) return setError(r.error);
            setOpen(false);
            toast.success(`Matched to ${account}`);
            router.refresh();
          }}
        >
          <Field label="Account ID" htmlFor={`acc-${id}`} error={error}>
            <Input
              id={`acc-${id}`}
              autoFocus
              value={account}
              onChange={(e) => {
                setAccount(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="JZM1042"
              aria-invalid={error ? true : undefined}
              className="uppercase tracking-widest"
            />
          </Field>
          <Button type="submit" size="lg" loading={busy} disabled={!account}>
            Match
          </Button>
        </form>
      </Modal>
    </>
  );
}
