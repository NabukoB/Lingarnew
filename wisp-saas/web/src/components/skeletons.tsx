import { Skeleton } from "@/components/ui/skeleton";

export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4 lg:gap-5" aria-busy="true" aria-label="Loading">
      <div className="flex h-[52px] items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-44" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        <Skeleton className="h-[176px] rounded-card" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[120px] rounded-tile" />
          ))}
        </div>
        <Skeleton className="h-[176px] rounded-card" />
      </div>
      <div className="hidden gap-5 lg:grid lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-[380px] rounded-card" />
        <Skeleton className="h-[380px] rounded-card" />
      </div>
    </div>
  );
}

export function PageSkeleton({ rows = 6, grid = false }: { rows?: number; grid?: boolean }) {
  return (
    <div className="flex flex-col gap-4 lg:gap-5" aria-busy="true" aria-label="Loading">
      <div className="flex h-[52px] items-center gap-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="ml-auto h-[46px] w-28 rounded-full" />
      </div>
      {grid ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: rows }, (_, i) => (
            <Skeleton key={i} className="h-[150px] rounded-tile" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-card bg-card p-5 shadow-card">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 flex-grow" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
