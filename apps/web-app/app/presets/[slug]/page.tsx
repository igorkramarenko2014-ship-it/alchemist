import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSharedPreset } from "@/lib/preset-store";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const preset = getSharedPreset(params.slug);
  if (!preset) {
    return { title: "Preset not found — Alchemist" };
  }

  const title =
    preset.prompt.length > 0
      ? `${preset.prompt} — Alchemist Serum Preset`
      : "Alchemist Generated Serum Preset";

  const description =
    preset.reasoning.length > 0 ? preset.reasoning.slice(0, 155) : "AI-generated Serum preset parameters (display only).";

  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: title,
    description,
    applicationCategory: "MusicApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0" },
    keywords: ["Serum preset", "synthesizer", "AI generated", preset.prompt],
  });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    other: {
      "application/ld+json": ld,
    },
  };
}

export default function PresetPage({ params }: Props) {
  const preset = getSharedPreset(params.slug);
  if (!preset) notFound();

  return (
    <main className="mx-auto max-w-[720px] px-6 py-10 text-gray-100">
      <h1 className="mb-2 text-2xl font-semibold text-white">{preset.prompt}</h1>

      <p className="mb-6 text-sm text-[#5EEAD4]">
        Score {(preset.score * 100).toFixed(0)}% · {preset.panelist} ·{" "}
        {new Date(preset.sharedAt).toLocaleDateString()}
      </p>

      {preset.description ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-300">Description</h2>
          <p className="text-sm leading-relaxed text-gray-400">{preset.description}</p>
        </section>
      ) : null}

      {preset.reasoning ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-300">Why this preset</h2>
          <p className="text-sm leading-relaxed text-gray-400">{preset.reasoning}</p>
        </section>
      ) : null}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-300">Parameter map</h2>
        <p className="mb-2 text-xs text-gray-500">Normalized values (0–1) — visualization only, not a download.</p>
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}
        >
          {preset.paramArray.slice(0, 128).map((v, i) => (
            <div
              key={i}
              title={`param ${i}: ${v.toFixed(3)}`}
              className="h-3 rounded-[1px]"
              style={{
                background: `rgba(94,234,212,${Math.min(1, Math.abs(v))})`,
              }}
            />
          ))}
        </div>
      </section>

      {preset.wasmAvailable ? (
        <p className="text-sm text-gray-500">
          .fxp export is available from the main Alchemist app when WASM encoder is healthy — this page does not
          serve bytes (HARD GATE).
        </p>
      ) : (
        <p className="text-sm text-gray-600">.fxp export unavailable (encoder not built or WASM not loaded).</p>
      )}

      <p className="mt-10">
        <Link href="/" className="text-[#5EEAD4] hover:underline">
          ← Generate your own
        </Link>
      </p>
    </main>
  );
}
