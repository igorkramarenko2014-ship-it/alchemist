import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-6 py-16 text-center">
      <p className="text-sm font-medium text-gray-500">404</p>
      <h1 className="mt-2 text-xl font-semibold text-[#5EEAD4]">Page not found</h1>
      <p className="mt-3 text-sm text-gray-400">
        If you expected the home page here, the dev server may be on another port — use the cyan banner
        URL. Stale <code className="text-gray-500">.next</code>? From repo root:{" "}
        <code className="text-gray-500">pnpm run clean</code> then <code className="text-gray-500">pnpm dev</code>.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex justify-center rounded-xl bg-[#5EEAD4] px-4 py-3 text-sm font-semibold text-[#111827]"
      >
        Back to Alchemist
      </Link>
    </main>
  );
}
