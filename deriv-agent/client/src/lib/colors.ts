export function scoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 70) return 'bg-lime-500';
  if (score >= 55) return 'bg-emerald-400/50';
  if (score >= 45) return 'bg-slate-500';
  if (score >= 30) return 'bg-orange-400/60';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-rose-500';
}

export function scoreText(score: number): string {
  if (score >= 70) return 'text-emerald-300';
  if (score >= 45) return 'text-slate-300';
  if (score >= 30) return 'text-orange-300';
  return 'text-rose-300';
}
