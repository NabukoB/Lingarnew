import { Wifi } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2.5">
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-blue-600 shadow-brand">
        <Wifi aria-hidden size={18} strokeWidth={2.6} className="text-white" />
      </span>
      <span className="text-[19px] font-extrabold tracking-tight">Mtandao</span>
    </div>
  );
}
