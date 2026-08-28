interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-surface-variant rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`bg-surface-container rounded-2xl p-4 border border-outline-variant ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-3 h-3 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export function SkeletonMatchCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`bg-surface-container rounded-2xl p-5 border border-outline-variant ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="space-y-2 text-center">
          <Skeleton className="h-4 w-16 mx-auto" />
          <Skeleton className="h-10 w-12 mx-auto" />
        </div>
        <Skeleton className="h-6 w-4" />
        <div className="space-y-2 text-center">
          <Skeleton className="h-4 w-16 mx-auto" />
          <Skeleton className="h-10 w-12 mx-auto" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonPlayerRow({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-surface-variant/30 rounded-lg">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}
