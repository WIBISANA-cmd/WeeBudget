import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { ChartSkeleton, Skeleton } from '../../components/feedback/LoadingSkeleton';

const tile = 'rounded-2xl bg-surface-100 p-4';
// On a tinted tile the default placeholder colour disappears, so these go one step darker.
const onTile = 'bg-surface-300';

/** Mirrors GoldSavingsPanel: price hero + simulator, three metrics, gram reference + price chart. */
export function GoldSavingsSkeleton() {
  return (
    <div className="space-y-3 md:space-y-4" aria-busy="true" aria-label="Memuat harga emas">
      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <Skeleton className="h-6 w-36 rounded-full" />
              <Skeleton className="mt-3 h-3.5 w-48" />
              <Skeleton className="mt-2 h-9 w-52 md:h-10" />
            </div>
            <div className="rounded-2xl border border-border-subtle p-4 md:w-64">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="mt-3 h-7 w-40 rounded-full" />
              <Skeleton className="mt-3 h-3.5 w-full" />
              <Skeleton className="mt-2 h-3.5 w-2/3" />
              <Skeleton className="mt-4 h-10 w-full rounded-xl" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1].map((index) => (
                <div key={index} className={tile}>
                  <Skeleton className={`h-3.5 w-24 ${onTile}`} />
                  <Skeleton className={`mt-2.5 h-7 w-32 ${onTile}`} />
                  <Skeleton className={`mt-2.5 h-3 w-28 ${onTile}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {['w-36', 'w-40', 'w-28'].map((width, index) => (
          <Card key={index}>
            <CardContent className="flex items-start gap-4">
              <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Skeleton className={`h-3.5 ${width}`} />
                <Skeleton className="mt-2 h-7 w-32" />
                <Skeleton className="mt-2 h-3.5 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="rounded-2xl border border-border-subtle bg-surface-100 p-4">
                <Skeleton className={`h-5 w-16 ${onTile}`} />
                <div className="mt-4 grid gap-2">
                  {[0, 1].map((row) => (
                    <div key={row} className="flex h-5 items-center justify-between gap-3">
                      <Skeleton className={`h-3.5 w-20 ${onTile}`} />
                      <Skeleton className={`h-3.5 w-24 ${onTile}`} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent className="space-y-5">
            <ChartSkeleton className="h-[320px]" xTicks={7} />
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1].map((index) => (
                <div key={index} className={tile}>
                  <Skeleton className={`h-3.5 w-24 ${onTile}`} />
                  <Skeleton className={`mt-2.5 h-4 w-32 ${onTile}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
