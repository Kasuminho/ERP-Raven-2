import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-5xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    </main>
  );
}
