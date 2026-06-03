function Shimmer({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-surface-100 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/10" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Shimmer className="h-36" />
        <Shimmer className="h-36" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Shimmer className="h-28" />
        <Shimmer className="h-28" />
        <Shimmer className="h-28" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Shimmer className="h-80" />
        <Shimmer className="h-80" />
      </div>
    </div>
  );
}

export default function LoadingSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Shimmer key={index} className={index === 0 ? 'h-20' : 'h-16'} />
      ))}
    </div>
  );
}
