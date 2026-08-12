import "server-only";

// Shared SSRF guard for any user-supplied n8n instance base URL this app
// forwards to the backend for a server-side fetch (PRD §6.4: only the
// Vercel frontend, Caddy's :443, and n8n's /webhook/* paths are meant to be
// internet-reachable — Qdrant, the reranker, and the n8n editor UI never
// are, but that's enforced by network topology, not by anything that stops
// an attacker-supplied baseUrl from being handed to the backend's own
// fetch). `new URL()` alone is a syntax check, not a safety check — it
// happily accepts http://169.254.169.254/, http://qdrant:6333, bare IPs,
// and internal hostnames. This allowlists instead: https only, no
// localhost/.local/.internal, no literal IPv4/IPv6 host.
//
// This is host-string filtering, not DNS-rebinding-proof — a hostname that
// resolves to a private range at request time would still pass this check.
// The durable fix is validating the resolved address at the actual fetch
// site (inside the n8n workflow, which isn't part of this repo); this is
// the defense-in-depth layer available at the one place in this codebase
// that decides what a user-supplied instance URL is allowed to look like
// before it ever leaves this app.
export function isSafeInstanceUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (!host) return false;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }

  // Reject a literal IPv4 address.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  // Reject a literal IPv6 address (URL hostnames carry brackets, e.g. "[::1]").
  if (host.startsWith("[") || host.includes(":")) return false;

  return true;
}
