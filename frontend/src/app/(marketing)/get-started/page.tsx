import type { Metadata } from "next";
import Link from "next/link";
import Tag from "@/components/marketing/Tag";
import { LineReveal, Rise } from "@/components/marketing/Reveal";
import SectionNav from "@/components/marketing/SectionNav";
import CodeBlock from "@/components/marketing/CodeBlock";
import Disclosure from "@/components/marketing/Disclosure";
import { NPM_PACKAGE, REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Get started",
  description:
    "Try Insight from your terminal with npx insight-n8n, paste an execution on the web, or connect an instance for ongoing monitoring. No account needed for the first two.",
};

const NAV = [
  { id: "terminal", label: "From your terminal" },
  { id: "execution", label: "Get the execution" },
  { id: "web", label: "On the web" },
  { id: "monitor", label: "Monitor an instance" },
  { id: "commands", label: "Commands" },
  { id: "trouble", label: "If it breaks" },
];

const ENGINES = [
  ["local", "GROQ_API_KEY is set, or --local", "Groq, with the redacted summary"],
  ["hosted", "no key, or --hosted", "Insight's pipeline, with the redacted execution"],
] as const;

const COMMANDS = [
  [`npx ${NPM_PACKAGE} demo [sample]`, "Diagnose a bundled failure: shape-changed, auth-expired, jwt-dropped-binary, transient-timeout."],
  ["insight diagnose execution.json", "Diagnose an execution from a file. Use - to read stdin."],
  ["insight diagnose --id 4821 --url …", "Fetch the execution from your instance first. The key is asked for, hidden, if N8N_API_KEY isn't set."],
  ["insight inspect execution.json", "Node trace, error, the failing node's input and what was redacted. No network at all."],
  ["insight redact execution.json", "Print the redacted JSON that would be sent, to check it by eye."],
  ["--json", "Machine-readable output, for scripts and CI."],
] as const;

const FAQ = [
  {
    q: "“No execution data found”",
    a: "The execution was fetched without its run data. Add includeData=true to the API call, or use insight diagnose --id, which does it for you.",
  },
  {
    q: "The hosted service says too many requests",
    a: "The hosted pipeline allows 5 diagnoses a minute per address, because it shares one Groq quota with everyone. Wait a minute, or set GROQ_API_KEY and run it on your own quota.",
  },
  {
    q: "My instance is on localhost",
    a: "The website can't reach it, on purpose: it refuses internal addresses. The CLI runs on your machine, so insight diagnose --id 4821 --url http://localhost:5678 works.",
  },
  {
    q: "It says “looks transient”",
    a: "The error matched a timeout, connection reset, rate limit or gateway error, so no model was asked. Re-run the workflow. If it keeps failing the same way, it isn't transient, and a diagnosis of the next failure will say more.",
  },
  {
    q: "The confidence is low",
    a: "Then Insight couldn't see the cause directly in the data. Read the explanation as a lead. Silent problems like a wrongly nested setting often only show up one or two nodes later.",
  },
  {
    q: "Add workflow did nothing after a failure",
    a: "n8n only runs an Error Workflow that is itself active, and Insight has to reach your instance from the internet to fetch the execution. Check that “Insight - Error Workflow Template” is active and your instance has a public URL.",
  },
];

function Step({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-border pb-[clamp(3.5rem,7vw,7rem)] pt-8">
      <p className="font-mono text-xs text-muted">0{n}</p>
      <LineReveal className="mt-3 text-[clamp(1.9rem,3.8vw,3.5rem)] font-semibold leading-[1] tracking-[-0.035em]" lines={[title]} />
      <div className="mt-8 space-y-6">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[64ch] leading-relaxed text-muted">{children}</p>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-foreground">{children}</span>;
}

export default function GetStartedPage() {
  return (
    <>
      <section className="px-[5vw] pb-[clamp(3rem,6vw,6rem)] pt-[clamp(2.5rem,6vw,6rem)]">
        <Rise inView={false}>
          <Tag>get started</Tag>
        </Rise>
        <LineReveal
          as="h1"
          inView={false}
          delay={0.1}
          className="mt-6 text-[clamp(2.75rem,8vw,8.5rem)] font-semibold leading-[0.93] tracking-[-0.045em]"
          lines={["Try it first.", "Sign up later."]}
        />
        <Rise inView={false} delay={0.45}>
          <p className="mt-8 max-w-[54ch] text-lg leading-relaxed text-muted">
            The core of Insight, a failed execution in and a calibrated diagnosis out, works without an account, from
            your terminal or the web. Signing in is only for connecting an instance so future failures are caught on
            their own.
          </p>
        </Rise>
      </section>

      <div className="grid gap-10 px-[5vw] lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] lg:gap-16">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <SectionNav items={NAV} label="get-started" />
          </div>
        </aside>

        <div>
          <Step id="terminal" n={1} title="From your terminal">
            <CodeBlock prompt label="no install, no account" code={`npx ${NPM_PACKAGE} demo`} />
            <P>
              That diagnoses a bundled sample failure so you can see the whole thing work. Then point it at one of your
              own. Node.js 18.17 or newer is all it needs; it has no dependencies.
            </P>
            <CodeBlock
              prompt
              label="your own failure"
              code={`npx ${NPM_PACKAGE} diagnose execution.json\nnpx ${NPM_PACKAGE} diagnose --id 4821 --url https://n8n.example.com`}
            />
            <P>
              Secrets are redacted on your machine before anything is printed or sent. Where the diagnosis itself runs
              depends on whether you have a Groq key (free, about a minute at <Mono>console.groq.com</Mono>):
            </P>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <caption className="sr-only">Where the CLI runs a diagnosis</caption>
                <thead>
                  <tr className="border-b border-border font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                    <th scope="col" className="py-3 pr-4 font-normal">Engine</th>
                    <th scope="col" className="py-3 pr-4 font-normal">When</th>
                    <th scope="col" className="py-3 font-normal">Who sees what</th>
                  </tr>
                </thead>
                <tbody>
                  {ENGINES.map(([engine, when, who]) => (
                    <tr key={engine} className="border-b border-border">
                      <th scope="row" className="py-3.5 pr-4 font-mono text-xs font-normal text-accent">{engine}</th>
                      <td className="py-3.5 pr-4 text-muted">{when}</td>
                      <td className="py-3.5 text-muted">{who}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              The local engine re-implements the pipeline in under a thousand lines with no dependencies: redact,
              short-circuit transient failures, one model call with the execution framed as untrusted data. It
              doesn&apos;t retrieve from the knowledge base, which is switched off on the hosted side too for now.
            </P>
          </Step>

          <Step id="execution" n={2} title="Get the execution">
            <P>
              Insight needs the execution with its run data: every node&apos;s input and output, not just the error. The
              CLI&apos;s <Mono>--id</Mono> fetches it for you. To save it as a file instead:
            </P>
            <CodeBlock
              prompt
              label="n8n public API"
              code={`curl -H "X-N8N-API-KEY: $N8N_API_KEY" \\\n  "https://n8n.example.com/api/v1/executions/4821?includeData=true" > execution.json`}
            />
            <P>
              The execution id is in the URL when you open a failed run in n8n&apos;s Executions list. Create an API key
              under Settings, n8n API. The CLI also reads the raw format n8n keeps in its <Mono>execution_data</Mono>{" "}
              table.
            </P>
          </Step>

          <Step id="web" n={3} title="On the web">
            <P>
              <Link href="/diagnose" className="text-foreground underline decoration-border underline-offset-4 hover:decoration-accent">
                The diagnose page
              </Link>{" "}
              takes the same file as an upload, or an execution id with your instance&apos;s public HTTPS URL and an API
              key. The key is held in memory for that one request and not kept.
            </P>
          </Step>

          <Step id="monitor" n={4} title="Monitor an instance">
            <ol className="max-w-[64ch] list-decimal space-y-3 pl-5 leading-relaxed text-muted marker:font-mono marker:text-xs">
              <li>
                <Link href="/signin" className="text-foreground underline decoration-border underline-offset-4 hover:decoration-accent">
                  Sign in
                </Link>{" "}
                with GitHub or Google, then connect your instance with its base URL and an API key.
              </li>
              <li>Insight lists every workflow on it and marks which ones are already monitored.</li>
              <li>
                Click <Mono>+ Add workflow</Mono> on the ones you want protected. Insight installs and activates its
                error-workflow template and points that workflow&apos;s Error Workflow setting at it.
              </li>
              <li>The next failure is diagnosed on its own, logged on your dashboard and sent to Slack.</li>
            </ol>
            <P>
              Rather not grant write access? Import the template yourself from the repository&apos;s{" "}
              <a
                href={`${REPO_URL}/tree/main/workflows`}
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline decoration-border underline-offset-4 hover:decoration-accent"
              >
                workflows folder
              </a>{" "}
              and paste in your ingest token. The result is the same, minus the automation.
            </P>
          </Step>

          <Step id="commands" n={5} title="Commands">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left text-sm">
                <caption className="sr-only">insight-n8n commands</caption>
                <tbody>
                  {COMMANDS.map(([cmd, what]) => (
                    <tr key={cmd} className="border-b border-border align-baseline first:border-t">
                      <th scope="row" className="py-3 pr-6 font-mono text-xs font-normal whitespace-nowrap">{cmd}</th>
                      <td className="py-3 text-muted">{what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              Installed globally with <Mono>npm install -g {NPM_PACKAGE}</Mono>, the command is <Mono>insight</Mono>.
            </P>
          </Step>

          <section id="trouble" className="scroll-mt-28 border-t border-border pt-8">
            <p className="font-mono text-xs text-muted">06</p>
            <LineReveal className="mt-3 text-[clamp(1.9rem,3.8vw,3.5rem)] font-semibold leading-[1] tracking-[-0.035em]" lines={["If it breaks"]} />
            <div className="mt-8 space-y-8">
              <Disclosure items={FAQ} />
              <div>
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.1em] text-muted">Running the website yourself</p>
                <CodeBlock
                  prompt
                  label="terminal"
                  code={`git clone ${REPO_URL} insight\ncd insight/frontend\nnpm install\ncp .env.example .env.local\nnpm run dev`}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
