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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-500 shadow-[0_8px_32px_rgba(239,68,68,0.12)]">
        <AlertCircle className="h-10 w-10" />
      </div>
      <h2 className="mt-8 font-display text-3xl tracking-wide text-slate-900">
        Something went wrong
      </h2>
      <p className="mx-auto mt-4 max-w-md text-slate-500">
        We apologize for the inconvenience. An unexpected error has occurred in the application.
      </p>
      <button
        onClick={() => reset()}
        className="mt-8 flex items-center gap-2 rounded-full bg-[#FF6B35] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,107,53,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(255,107,53,0.38)] active:scale-95"
      >
        <RotateCcw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
