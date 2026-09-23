# insight-n8n

Find out why an n8n execution failed from your terminal: the node where it broke, the likely root cause, how confident that is, and the change to make. Secrets are redacted on your machine before anything is printed or sent.

[![npm](https://img.shields.io/npm/v/insight-n8n?style=for-the-badge&logo=npm&logoColor=white&color=CB3837)](https://www.npmjs.com/package/insight-n8n)
[![Website](https://img.shields.io/badge/Website-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://insightby.filheinzrelatorre.com/get-started)

This is the command-line half of [Insight](https://github.com/jabluetooth/insight). No account, no install:

```bash
npx insight-n8n demo
```

## Diagnose your own failure

```bash
# an execution you exported or fetched from the n8n API
npx insight-n8n diagnose execution.json

# or let the CLI fetch it: your API key is used once, on this machine, and never sent anywhere else
npx insight-n8n diagnose --id 4821 --url https://n8n.example.com
```

Works with `localhost` instances too, which the website can't reach.

To get the JSON by hand: `GET /api/v1/executions/{id}?includeData=true` with your `X-N8N-API-KEY` header. The CLI also reads the raw `execution_data` format n8n stores in its database.

## Where the diagnosis runs

| | How | What leaves your machine |
|---|---|---|
| **Local** (when `GROQ_API_KEY` is set, or `--local`) | One call to Groq with your own key. Free key at [console.groq.com/keys](https://console.groq.com/keys). | The redacted execution summary, to Groq only |
| **Hosted** (default without a key, or `--hosted`) | The same pipeline the [/diagnose](https://insightby.filheinzrelatorre.com/diagnose) page uses. Rate-limited to 5 requests a minute. | The redacted execution, to Insight's service |

Known infrastructure failures (timeouts, connection resets, 429s, 502 to 504s) are recognized locally and reported as transient without any model call.

The local engine is a portable re-implementation of the hosted n8n workflow: redact, short-circuit, one bounded LLM call with the execution framed as untrusted data. It has no knowledge-base retrieval (switched off in the hosted pipeline too, for now) and carries the known n8n failure patterns in its prompt instead.

## Commands

| Command | Does |
|---|---|
| `insight demo [sample]` | Diagnoses a bundled sample: `shape-changed`, `auth-expired`, `jwt-dropped-binary`, `transient-timeout` |
| `insight diagnose <file \| ->` | Diagnoses an execution from a file or stdin |
| `insight inspect <file \| ->` | Shows the node trace, the error, the failing node's input and what was redacted. Fully offline |
| `insight redact <file \| ->` | Prints the redacted JSON that would be sent, so you can check it first |

Options: `--local`, `--hosted`, `--json`, `--model <id>` (default `llama-3.3-70b-versatile`), `--api-url <url>`, `--id <id> --url <url>`. `NO_COLOR` turns colour off.

## Confidence

The same thresholds as the web app. Under 40% the explanation is marked as a lead to check and the fix as one to verify before applying. The CLI never presents a guess with the same certainty as a confirmed cause.

## Redaction

Two passes over every value: fields named like secrets (`password`, `token`, `apiKey`, `Authorization`, `Cookie`, n8n's `{ name, value }` header pairs) and strings shaped like credentials (bearer tokens, JWTs, `sk-`, `gsk_`, `xoxb-`, `ghp_`, `AKIA`, Stripe keys, private keys, passwords in URLs, keys in query strings). n8n expressions such as `={{ $json.token }}` are kept, because they're references rather than secrets.

It's pattern matching, not a guarantee. Run `insight redact` to see exactly what would be sent.

## License

MIT
