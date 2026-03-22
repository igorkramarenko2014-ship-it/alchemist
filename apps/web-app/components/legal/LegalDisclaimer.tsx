/**
 * Trademark + rights footer — aligns with FIRE §G / FIRESTARTER §14 (not legal advice).
 * Does not replace a full privacy policy for a public launch; see root PRIVACY.md template.
 */
export function LegalDisclaimer() {
  return (
    <footer
      className="mt-auto border-t border-brand-primary/20 bg-[#111827] px-4 py-4 text-[10px] leading-relaxed text-gray-500"
      role="contentinfo"
    >
      <p>
        © {new Date().getFullYear()} Project Alchemist / Vibe Projects. All rights reserved.
        {" "}
        <strong className="font-normal text-gray-400">Serum</strong> is a trademark of
        Xfer Records, Inc. This software is an independent tool and is{" "}
        <strong className="font-normal text-gray-400">not</strong> affiliated with,
        endorsed by, or sponsored by Xfer Records.
      </p>
      <p className="mt-2 opacity-70">
        AI features may send prompts to third-party providers per your configuration — see
        the project <code className="text-gray-600">PRIVACY.md</code> (template) and{" "}
        <code className="text-gray-600">LEGAL.md</code>. Any optional research or indexing of
        third-party presets, packs, or “training-style” metadata is your responsibility —
        respect copyrights, trademarks, and license terms; this app does not claim rights in
        third-party soundware.
      </p>
    </footer>
  );
}
