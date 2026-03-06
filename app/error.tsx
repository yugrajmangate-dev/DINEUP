"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
        <AlertCircle className="h-10 w-10" />
      </div>
      <h2 className="mt-8 font-display text-3xl tracking-wide text-white">
        Something went wrong
      </h2>
      <p className="mx-auto mt-4 max-w-md text-zinc-400">
        We apologize for the inconvenience. An unexpected error has occurred in the application.
      </p>
      <button
        onClick={() => reset()}
        className="mt-8 flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-all hover:bg-zinc-200 active:scale-95"
      >
        <RotateCcw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
