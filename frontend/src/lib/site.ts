// Where the public site, the source and the CLI live. Defaults are the real
// ones; the env vars exist so a fork can point its own deployment elsewhere.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://insightby.filheinzrelatorre.com";
export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/jabluetooth/insight";
export const NPM_PACKAGE = "insight-n8n";
export const NPM_URL = `https://www.npmjs.com/package/${NPM_PACKAGE}`;
