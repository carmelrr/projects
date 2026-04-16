import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="w-full max-w-md space-y-4">
      <Skeleton className="mx-auto h-12 w-32" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
