export function AppHeader() {
  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = now.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const dateLabel = `${weekday}, ${monthDay}`;

  return (
    <header className="bg-lingar-dark px-4 py-3 flex items-center justify-between sticky top-0 z-10 border-b border-white/5">
      <div className="flex items-center gap-3">
        <span
          className="text-lingar-gold text-[30px] leading-none select-none"
          style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 }}
        >
          L
        </span>
        <div>
          <p className="text-lingar-gold font-bold tracking-[0.2em] text-[12px] uppercase leading-none">
            LINGAR
          </p>
          <p className="text-lingar-ghost text-[9px] tracking-wide mt-0.5">
            Personal Intelligence OS
          </p>
        </div>
      </div>
      <p className="text-lingar-ghost text-[12px]">{dateLabel}</p>
    </header>
  );
}
