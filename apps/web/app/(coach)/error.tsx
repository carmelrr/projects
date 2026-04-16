'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-6 lg:p-8">
      <Card className="border-destructive/30 bg-destructive/[0.03]">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {error.message || 'An unexpected error occurred while loading this page.'}
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-[10px] text-muted-foreground/70">
                Reference: {error.digest}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="gradient" onClick={reset}>
              <RefreshCw className="size-4" />
              Try again
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
              Go to dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
