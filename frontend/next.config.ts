import type { NextConfig } from "next";

// Security headers applied to every response. Vercel already supplies HSTS;
// everything below is this app's own defense-in-depth on top of that,
// mainly relevant to the authenticated /dashboard and the LLM-generated
// text rendered on /diagnose (PRD §4.2/§4.5).
const securityHeaders = [
  // No legitimate reason for this app to be framed by another origin —
  // the dashboard and diagnose pages aren't meant to be embedded.
  { key: "X-Frame-Options", value: "DENY" },
  // Defense-in-depth CSP: frame-ancestors backs X-Frame-Options for
  // browsers that only honor CSP; base-uri/form-action are cheap to pin
  // down and close off some injection primitives even though this app has
  // no dangerouslySetInnerHTML/innerHTML/eval anywhere in its source.
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Never leak the current URL (which can carry an execution id, an
  // instance id, or a callbackUrl) to a third-party destination via the
  // Referer header on an outbound link/asset.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
