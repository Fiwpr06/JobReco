import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function JobCardSkeleton() {
  return (
    <Card className="bg-surface border-border overflow-hidden animate-pulse mb-4">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <Skeleton className="h-6 w-2/3 bg-elevated rounded-md mb-2" />
            <Skeleton className="h-4 w-1/3 bg-elevated rounded-md" />
          </div>
          <Skeleton className="h-8 w-24 bg-elevated rounded-md" />
        </div>
        
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-5 w-20 bg-elevated rounded-md" />
          <Skeleton className="h-5 w-20 bg-elevated rounded-md" />
          <Skeleton className="h-5 w-24 bg-elevated rounded-md" />
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 bg-elevated rounded-full" />
            <Skeleton className="h-6 w-20 bg-elevated rounded-full" />
            <Skeleton className="h-6 w-16 bg-elevated rounded-full" />
          </div>
          <Skeleton className="h-9 w-24 bg-elevated rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}
