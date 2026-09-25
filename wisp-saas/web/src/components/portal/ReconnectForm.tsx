"use client";

import { MessageSquareText, RefreshCw } from "lucide-react";
import { isMpesaReceipt } from "@/lib/format";
import { CodeForm } from "./CodeForm";

export function ReconnectForm() {
  return (
    <CodeForm
      length={10}
      title="M-Pesa code"
      hint="From your M-Pesa SMS"
      icon={MessageSquareText}
      button="Reconnect"
      buttonIcon={RefreshCw}
      validate={(c) => (isMpesaReceipt(c) ? null : "Check the code and try again")}
      successHref="/portal/online"
    />
  );
}
