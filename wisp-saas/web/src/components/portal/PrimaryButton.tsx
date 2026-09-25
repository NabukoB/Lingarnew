import clsx from "clsx";

export const primaryButtonClass =
  "flex h-[60px] w-full items-center justify-center gap-2.5 rounded-[18px] text-[17px] font-extrabold text-white shadow-brand disabled:opacity-50";

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={clsx(primaryButtonClass, className)} style={{ background: "var(--accent)" }}>
      {children}
    </button>
  );
}
