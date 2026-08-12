// Shared format validators for path/body identifiers this app forwards into
// either a Postgres query (instanceId) or an n8n REST API path (workflowId).
// Neither of these enforces ownership — that's a separate, already-required
// check (getInstanceById) — these only reject shapes that would either blow
// up the query with a raw DB error (a malformed instanceId) or get
// interpolated into a URL path on a third-party instance in a way that
// could target something other than the intended `/workflows/{id}` endpoint
// (a malformed workflowId).

/** connected_instances.id is a Postgres SERIAL — always a plain positive integer. */
export function isValidInstanceId(id: string): boolean {
  return /^[1-9][0-9]*$/.test(id);
}

/** n8n's own workflow ids are short alphanumeric (nanoid-style) strings — never a path segment. */
export function isValidWorkflowId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(id);
}
