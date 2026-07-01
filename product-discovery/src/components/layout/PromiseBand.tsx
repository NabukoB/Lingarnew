const PROMISES = [
  {
    number: "01",
    title: "Hand-picked",
    body: "Every product is reviewed by our team before it reaches you. No filler, no shortcuts.",
  },
  {
    number: "02",
    title: "Honest quality",
    body: "Real ratings, real stock counts, and accurate pricing — no dark patterns.",
  },
  {
    number: "03",
    title: "Made to last",
    body: "We favour pieces built for decades, not seasons. Craftsmanship over trend.",
  },
];

export function PromiseBand() {
  return (
    <section className="bg-pine py-20">
      <div className="mx-auto max-w-[1240px] px-7">
        <div className="grid gap-10 md:grid-cols-3 md:gap-12">
          {PROMISES.map(({ number, title, body }) => (
            <div key={number} className="flex flex-col gap-3">
              <span className="font-display text-4xl font-semibold text-pine-tint/40">
                {number}
              </span>
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-pine-tint/70">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
