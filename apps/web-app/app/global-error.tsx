"use client";

/**
 * Root-level error UI when `app/layout.tsx` (or other root shell) throws.
 * Required to be a client component with its own <html>/<body> per Next.js App Router.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" dir="ltr" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#111827] px-6 text-gray-100">
        <h1 className="text-xl font-semibold text-[#5EEAD4]">Alchemist — fatal error</h1>
        <p className="mt-4 max-w-md text-center text-sm text-gray-400">
          {error.message || "The app shell failed to load."}
        </p>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-[#5EEAD4] px-4 py-3 text-sm font-semibold text-[#111827]"
          >
            Try again
          </button>
        </div>
        <p className="mt-10 text-center text-xs text-gray-600">
          From the monorepo root: <code className="text-gray-500">pnpm alc:doctor</code>, then try{" "}
          <code className="text-gray-500">pnpm dev:recover</code> or{" "}
          <code className="text-gray-500">pnpm web:dev:fresh</code>, then{" "}
          <code className="text-gray-500">pnpm dev</code>. Open the <strong>127.0.0.1</strong> URL from
          the terminal banner (not only <code className="text-gray-500">localhost</code>).
        </p>
      </body>
    </html>
  );
}
