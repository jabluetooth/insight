// Reading an n8n execution and pulling out what a diagnosis needs: which
// node failed, what it was, what it received, and what the error said.
//
// Accepts every shape an execution realistically arrives in:
//   - the public API response, GET /api/v1/executions/{id}?includeData=true
//   - the same object with `data` still serialized as a string, including
//     n8n's internal "flatted" format (what you get reading the
//     execution_data table directly)
//   - a list response ({ data: [ ...executions ] }), where the first failed
//     execution is used

const MAX_INPUT_CHARS = 1800;
const MAX_PARAM_CHARS = 1800;

export class ExecutionError extends Error {}

/** n8n stores execution data with `flatted`: one array, every string and object referenced by index. */
export function parseFlatted(input) {
  if (!Array.isArray(input) || input.length === 0) return input;
  const revived = new Set();
  const resolve = (ref) => {
    const target = input[Number(ref)];
    return target !== null && typeof target === "object" ? revive(target) : target;
  };
  const revive = (obj) => {
    if (revived.has(obj)) return obj;
    revived.add(obj);
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === "string") obj[key] = resolve(obj[key]);
    }
    return obj;
  };
  return input[0] !== null && typeof input[0] === "object" ? revive(input[0]) : input[0];
}

function looksFlatted(value) {
  return (
    Array.isArray(value) &&
    value.length > 1 &&
    value[0] !== null &&
    typeof value[0] === "object" &&
    Object.values(value[0]).some((v) => typeof v === "string" && /^\d+$/.test(v))
  );
}

function decodeData(data) {
  if (typeof data !== "string") return looksFlatted(data) ? parseFlatted(data) : data;
  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch {
    throw new ExecutionError("The execution's `data` field is a string but not valid JSON.");
  }
  return looksFlatted(parsed) ? parseFlatted(parsed) : parsed;
}

/** Parses JSON text into a normalized execution object: { id, status, data: { resultData }, workflowData }. */
export function parseExecution(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ExecutionError("That isn't valid JSON. Export the failed execution from n8n and try again.");
  }
  return normalizeExecution(raw);
}

export function normalizeExecution(raw) {
  let exec = looksFlatted(raw) ? parseFlatted(raw) : raw;
  if (exec === null || typeof exec !== "object" || Array.isArray(exec)) {
    throw new ExecutionError("Expected an n8n execution object.");
  }

  // A list response from GET /executions: take the first failure.
  if (Array.isArray(exec.data) && exec.data.every((e) => e && typeof e === "object")) {
    const failed = exec.data.find((e) => e.status === "error" || e.status === "crashed") ?? exec.data[0];
    if (!failed) throw new ExecutionError("The execution list is empty.");
    exec = failed;
  }

  // A bare resultData or runData, pasted on its own.
  if (!exec.data && exec.runData) exec = { data: { resultData: exec } };
  if (!exec.data && exec.resultData) exec = { data: exec };

  const data = decodeData(exec.data);
  if (!data || typeof data !== "object" || !data.resultData) {
    throw new ExecutionError(
      "No execution data found. When fetching from the API, pass includeData=true; when exporting, include the run data."
    );
  }
  return { ...exec, data };
}

function truncate(value, max) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (text === undefined) return undefined;
  return text.length > max ? text.slice(0, max) + `\n… (${text.length - max} more characters)` : text;
}

function runStatus(run) {
  if (run.error) return "error";
  if (run.executionStatus) return run.executionStatus === "success" ? "success" : run.executionStatus;
  return "success";
}

function itemCount(run) {
  const main = run?.data?.main;
  if (!Array.isArray(main)) return 0;
  return main.reduce((n, branch) => n + (Array.isArray(branch) ? branch.length : 0), 0);
}

/**
 * Everything the diagnosis prompt and the terminal output need, in one
 * plain object. Call it on already-redacted data.
 */
export function summarize(exec) {
  const resultData = exec.data.resultData ?? {};
  const runData = resultData.runData ?? {};
  const nodes = Array.isArray(exec.workflowData?.nodes) ? exec.workflowData.nodes : [];
  const nodeByName = new Map(nodes.map((n) => [n.name, n]));

  const trace = Object.entries(runData)
    .map(([name, runs]) => {
      const list = Array.isArray(runs) ? runs : [];
      const last = list[list.length - 1] ?? {};
      return {
        name,
        type: nodeByName.get(name)?.type ?? null,
        status: runStatus(last),
        startTime: last.startTime ?? 0,
        ms: typeof last.executionTime === "number" ? last.executionTime : null,
        items: itemCount(last),
        runs: list.length,
      };
    })
    .sort((a, b) => a.startTime - b.startTime);

  const topError = resultData.error ?? null;
  const erroredNode = trace.find((t) => t.status === "error")?.name;
  const failingName = topError?.node?.name ?? erroredNode ?? resultData.lastNodeExecuted ?? null;

  const failingRuns = failingName ? runData[failingName] : null;
  const failingRun = Array.isArray(failingRuns) ? failingRuns[failingRuns.length - 1] : null;
  const err = failingRun?.error ?? topError ?? {};

  // Input = the output of whichever node(s) fed the failing one on that run.
  let input;
  const sources = Array.isArray(failingRun?.source) ? failingRun.source.filter(Boolean) : [];
  if (sources.length > 0) {
    input = sources.map((s) => {
      const prevRuns = runData[s.previousNode];
      const prev = Array.isArray(prevRuns) ? prevRuns[s.previousNodeRun ?? prevRuns.length - 1] : null;
      const items = prev?.data?.main?.[s.previousNodeOutput ?? 0] ?? [];
      return { from: s.previousNode, items: items.slice(0, 2).map((i) => i?.json ?? i) };
    });
  }

  const failingNode = failingName ? nodeByName.get(failingName) : null;
  const statusText = exec.status ?? (topError ? "error" : exec.finished ? "success" : "unknown");

  return {
    executionId: exec.id != null ? String(exec.id) : null,
    workflowName: exec.workflowData?.name ?? null,
    status: statusText,
    mode: exec.mode ?? null,
    lastNodeExecuted: resultData.lastNodeExecuted ?? null,
    failed: Boolean(topError || erroredNode || statusText === "error" || statusText === "crashed"),
    failingNode: failingName
      ? {
          name: failingName,
          type: failingNode?.type ?? err.node?.type ?? null,
          typeVersion: failingNode?.typeVersion ?? err.node?.typeVersion ?? null,
          parameters: truncate(failingNode?.parameters ?? err.node?.parameters ?? {}, MAX_PARAM_CHARS),
        }
      : null,
    error: {
      message: err.message ?? null,
      description: err.description ?? null,
      httpCode: err.httpCode != null ? String(err.httpCode) : null,
      name: err.name ?? null,
      stack: typeof err.stack === "string" ? err.stack.split("\n").slice(0, 6).join("\n") : null,
    },
    input: input ? truncate(input, MAX_INPUT_CHARS) : null,
    trace: trace.map(({ startTime: _s, ...rest }) => rest),
  };
}

/** Short node type for display: "n8n-nodes-base.httpRequest" → "httpRequest". */
export function shortType(type) {
  if (!type) return null;
  const i = type.lastIndexOf(".");
  return i >= 0 ? type.slice(i + 1) : type;
}
