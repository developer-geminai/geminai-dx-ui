import { Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-3 h-4 w-32" />
      <Skeleton className="mb-8 h-9 w-72" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
