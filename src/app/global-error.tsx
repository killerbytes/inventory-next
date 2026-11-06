"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * GlobalError boundary for Next.js App Router root layout failures.
 * Captures critical uncaught rendering exceptions to Sentry and renders
 * an accessible recovery fallback with optional digest tracking.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center p-4 bg-neutral-50 text-neutral-900 font-sans dark:bg-neutral-950 dark:text-neutral-50">
        <div className="max-w-md w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm text-center">
          <h2 className="text-xl font-semibold tracking-tight text-red-600 dark:text-red-400 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            An unexpected error occurred and has been reported to monitoring.
          </p>
          {error.digest && (
            <p className="text-xs text-neutral-500 font-mono mb-4">
              Error Digest: {error.digest}
            </p>
          )}
          {reset && (
            <button
              onClick={() => reset()}
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 shadow hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              Try again
            </button>
          )}
        </div>
      </body>
    </html>
  );
}

