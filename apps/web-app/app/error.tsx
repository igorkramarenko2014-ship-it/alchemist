"use client";

import { useEffect } from "react";

/**
 * Catches runtime errors in the App Router segment tree (below layout).
 * Helps recover from client bundle / R3F / shared-engine failures without a blank screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Alchemist] route error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-xl font-semibold text-[#5EEAD4]">Something broke</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-400">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-[#5EEAD4] px-4 py-3 text-sm font-semibold text-[#111827]"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
          className="rounded-xl border border-gray-600 px-4 py-3 text-sm text-gray-300"
        >
          Reload app
        </button>
      </div>
      <p className="mt-8 text-xs text-gray-600">
        Dev (English UI only): <code className="text-gray-500">pnpm alc:doctor</code> · broken dev cache{" "}
        <code className="text-gray-500">pnpm dev:recover</code> · full clean{" "}
        <code className="text-gray-500">pnpm web:dev:fresh</code> · see{" "}
        <code className="text-gray-500">vst/README.md</code>
      </p>
    </main>
  );
}
