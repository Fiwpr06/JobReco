import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function MatchResultSkeleton() {
  return (
    <Card className="bg-surface border-border-mid mb-4 overflow-hidden animate-pulse">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-6 w-16 bg-elevated rounded-md" />
              <Skeleton className="h-7 w-3/4 bg-elevated rounded-md" />
            </div>
            <Skeleton className="h-5 w-1/2 bg-elevated rounded-md" />
          </div>
          <div className="flex flex-col items-end">
            <Skeleton className="h-10 w-16 bg-elevated rounded-md mb-2" />
            <Skeleton className="h-4 w-24 bg-elevated rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-16 bg-elevated mb-2 rounded-md" />
              <Skeleton className="h-2 w-full bg-elevated rounded-full" />
            </div>
          ))}
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20 bg-elevated rounded-md" />
            <Skeleton className="h-6 w-24 bg-elevated rounded-full" />
            <Skeleton className="h-6 w-20 bg-elevated rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 bg-elevated rounded-md" />
            <Skeleton className="h-6 w-32 bg-elevated rounded-full" />
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
          <Skeleton className="h-4 w-2/3 bg-elevated rounded-md" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 bg-elevated rounded-md" />
            <Skeleton className="h-10 w-28 bg-accent/20 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
