import { readFile, writeFile } from "node:fs/promises";

type Options = {
  input: string;
  output: string;
  cnDoh: string;
  overrideFile?: string;
};

const DEFAULT_INPUT =
  "https://raw.githubusercontent.com/felixonmars/dnsmasq-china-list/master/accelerated-domains.china.conf";
const DEFAULT_OUTPUT = "examples/sample-output.sgmodule";
const DEFAULT_CN_DOH = "https://dns.alidns.com/dns-query";

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    cnDoh: DEFAULT_CN_DOH,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    const val = argv[i + 1];

    if (arg === "--input" && val) {
      opts.input = val;
      i += 1;
      continue;
    }
    if (arg === "--output" && val) {
      opts.output = val;
      i += 1;
      continue;
    }
    if (arg === "--cn-doh" && val) {
      opts.cnDoh = val;
      i += 1;
      continue;
    }
    if (arg === "--override-file" && val) {
      opts.overrideFile = val;
      i += 1;
      continue;
    }
    if (arg === "--help") {
      printHelp();
      process.exit(0);
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

function printHelp(): void {
  console.log(`Usage: node dist/index.js [options]\n\nOptions:\n  --input <file-or-url>      dnsmasq list source\n  --output <path>            output sgmodule path\n  --cn-doh <url>             CN DoH endpoint\n  --override-file <path>     optional extra domain list, one per line\n  --help                     show help`);
}

async function readText(input: string): Promise<string> {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    const res = await fetch(input);
    if (!res.ok) {
      throw new Error(`Failed to fetch input: ${res.status} ${res.statusText}`);
    }
    return await res.text();
  }
  return await readFile(input, "utf8");
}

function extractDomainsFromDnsmasq(content: string): Set<string> {
  const domains = new Set<string>();
  const lines = content.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^server=\/([^/]+)\//);
    if (!match) {
      continue;
    }

    const domain = match[1]?.toLowerCase().trim();
    if (!domain) {
      continue;
    }
    domains.add(domain);
  }

  return domains;
}

function extractDomainsFromPlainList(content: string): Set<string> {
  const out = new Set<string>();
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim().toLowerCase();
    if (!line || line.startsWith("#")) {
      continue;
    }
    out.add(line.replace(/^\./, ""));
  }
  return out;
}

function renderModule(domains: string[], cnDoh: string): string {
  const header = [
    "#!name=CN DNS Split",
    "#!desc=Auto-generated CN domain -> CN DoH mapping for Surge 4.x",
    "",
    "[Host]",
  ];

  const body: string[] = [];
  for (const domain of domains) {
    body.push(`${domain} = server:${cnDoh}`);
    body.push(`*.${domain} = server:${cnDoh}`);
  }

  return `${header.join("\n")}\n${body.join("\n")}\n`;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const baseContent = await readText(opts.input);
  const domains = extractDomainsFromDnsmasq(baseContent);

  if (opts.overrideFile) {
    const extraContent = await readFile(opts.overrideFile, "utf8");
    const extraDomains = extractDomainsFromPlainList(extraContent);
    for (const d of extraDomains) {
      domains.add(d);
    }
  }

  const sorted = [...domains].sort((a, b) => a.localeCompare(b));
  const output = renderModule(sorted, opts.cnDoh);
  await writeFile(opts.output, output, "utf8");

  console.log(
    `generated ${opts.output} with ${sorted.length} domains (${sorted.length * 2} host mappings)`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
