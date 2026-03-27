import { Head, Html, Main, NextScript } from "next/document";

/**
 * Compatibility safety-net for intermittent Next build resolver errors
 * where /_document is looked up during "Collecting page data".
 * App Router remains the primary runtime surface.
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
