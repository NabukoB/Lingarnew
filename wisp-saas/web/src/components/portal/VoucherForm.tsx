"use client";

import { Ticket, Wifi } from "lucide-react";
import { CodeForm } from "./CodeForm";

export function VoucherForm() {
  return (
    <CodeForm
      length={8}
      title="Voucher code"
      hint="On your printed voucher"
      icon={Ticket}
      button="Connect"
      buttonIcon={Wifi}
      validate={(c) => (/^[A-Z0-9]{8}$/.test(c) ? null : "Check the code and try again")}
      successHref="/portal/online?pkg=h1d"
    />
  );
}
