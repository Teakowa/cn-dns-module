import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type Mode = "surge4" | "mapping";

type Options = {
  input: string;
  output: string;
  cnDoh: string;
  bytedanceDoh: string;
  overrideFile?: string;
  mode: Mode;
  generateAll: boolean;
  modulesDir: string;
  repo: string;
};

const DEFAULT_INPUT =
  "https://raw.githubusercontent.com/felixonmars/dnsmasq-china-list/master/accelerated-domains.china.conf";
const DEFAULT_OUTPUT = "examples/sample-output.sgmodule";
const DEFAULT_CN_DOH = "https://dns.alidns.com/dns-query";
const DEFAULT_BYTEDANCE_DOH = "https://doh.pub/dns-query";
const DEFAULT_MODULES_DIR = "modules";
const DEFAULT_REPO = "Teakowa/cn-dns-module";

const DEFAULT_BYTEDANCE_DOMAINS = [
  "amemv.com",
  "bytedance.com",
  "byteimg.com",
  "doubao.com",
  "douyin.com",
  "douyinpic.com",
  "douyinstatic.com",
  "ibytedtos.com",
  "snssdk.com",
  "toutiao.com",
  "toutiaocloud.com",
  "volccdn.com",
  "volces.com",
];

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    cnDoh: DEFAULT_CN_DOH,
    bytedanceDoh: DEFAULT_BYTEDANCE_DOH,
    mode: "surge4",
    generateAll: false,
    modulesDir: DEFAULT_MODULES_DIR,
    repo: DEFAULT_REPO,
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
    if (arg === "--bytedance-doh" && val) {
      opts.bytedanceDoh = val;
      i += 1;
      continue;
    }
    if (arg === "--override-file" && val) {
      opts.overrideFile = val;
      i += 1;
      continue;
    }
    if (arg === "--mode" && val) {
      if (val !== "surge4" && val !== "mapping") {
        throw new Error(`Invalid --mode: ${val}`);
      }
      opts.mode = val;
      i += 1;
      continue;
    }
    if (arg === "--modules-dir" && val) {
      opts.modulesDir = val;
      i += 1;
      continue;
    }
    if (arg === "--repo" && val) {
      opts.repo = val;
      i += 1;
      continue;
    }
    if (arg === "--generate-all") {
      opts.generateAll = true;
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
  console.log(`Usage: node dist/index.js [options]\n\nOptions:\n  --input <file-or-url>       dnsmasq list source\n  --output <path>             output sgmodule path for single mode\n  --mode <surge4|mapping>     single output mode (default surge4)\n  --cn-doh <url>              CN DoH endpoint\n  --bytedance-doh <url>       ByteDance preferred CN DoH endpoint\n  --override-file <path>      optional domain list, one per line\n  --generate-all              generate modules/* full artifacts\n  --modules-dir <path>        artifacts directory (default modules)\n  --repo <owner/name>         GitHub repo for jsDelivr URL\n  --help                      show help`);
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

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^\./, "");
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

    const domain = normalizeDomain(match[1] ?? "");
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
    const line = raw.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const domain = normalizeDomain(line);
    if (domain) {
      out.add(domain);
    }
  }
  return out;
}

function sortedUnique(domains: Iterable<string>): string[] {
  return [...new Set(domains)].sort((a, b) => a.localeCompare(b));
}

function renderSurge4Module(
  domains: string[],
  cnDoh: string,
  bytedanceDomains: string[],
  bytedanceDoh: string
): string {
  const header = [
    "#!name=CN DNS Split",
    "#!desc=Expanded Local DNS Mapping for Surge 4.x and above",
    "",
    "[Host]",
  ];

  const body: string[] = [];
  for (const domain of domains) {
    body.push(`${domain} = server:${cnDoh}`);
    body.push(`*.${domain} = server:${cnDoh}`);
  }

  body.push("", "# ByteDance preferred CN DoH overrides");
  for (const domain of bytedanceDomains) {
    body.push(`${domain} = server:${bytedanceDoh}`);
    body.push(`*.${domain} = server:${bytedanceDoh}`);
  }

  return `${header.join("\n")}\n${body.join("\n")}\n`;
}

function trimSlashes(input: string): string {
  return input.replace(/^\/+/, "").replace(/\/+$/, "");
}

function renderMappingModule(
  repo: string,
  modulesDir: string,
  cnDoh: string,
  bytedanceDoh: string
): string {
  const base = `https://cdn.jsdelivr.net/gh/${repo}@main/${trimSlashes(modulesDir)}`;
  return [
    "#!name=CN DNS Mapping",
    "#!desc=Local DNS Mapping via DOMAIN-SET (Surge iOS 5.17+ / Mac 5.10+)",
    "",
    "[Host]",
    `DOMAIN-SET:${base}/china-domains.txt = server:${cnDoh}`,
    `DOMAIN-SET:${base}/bytedance-domains.txt = server:${bytedanceDoh}`,
    "",
  ].join("\n");
}

function renderModulesReadme(repo: string, modulesDir: string): string {
  const base = `https://cdn.jsdelivr.net/gh/${repo}@main/${trimSlashes(modulesDir)}`;
  return [
    "# Modules",
    "",
    "- `cn-dns-split.sgmodule`: Expanded [Host] entries for Surge 4.x compatibility.",
    "- `cn-dns-mapping.sgmodule`: DOMAIN-SET based Local DNS Mapping for Surge iOS 5.17+ / Mac 5.10+.",
    "",
    "## Suggested Subscriptions",
    "",
    `- Expanded: ${base}/cn-dns-split.sgmodule`,
    `- Mapping: ${base}/cn-dns-mapping.sgmodule`,
    "",
    "## Domain Lists",
    "",
    `- China domains: ${base}/china-domains.txt`,
    `- ByteDance domains: ${base}/bytedance-domains.txt`,
    "",
  ].join("\n");
}

async function ensureParent(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

async function generateAll(opts: Options, allDomains: string[], overrideDomains: string[]): Promise<void> {
  const modulesDir = opts.modulesDir;
  await mkdir(modulesDir, { recursive: true });

  const bytedanceDomains = sortedUnique([...DEFAULT_BYTEDANCE_DOMAINS, ...overrideDomains]);
  const chinaDomainsPath = `${modulesDir}/china-domains.txt`;
  const bytedanceDomainsPath = `${modulesDir}/bytedance-domains.txt`;
  const surge4ModulePath = `${modulesDir}/cn-dns-split.sgmodule`;
  const mappingModulePath = `${modulesDir}/cn-dns-mapping.sgmodule`;
  const modulesReadmePath = `${modulesDir}/README.md`;

  await writeFile(chinaDomainsPath, `${allDomains.join("\n")}\n`, "utf8");
  await writeFile(bytedanceDomainsPath, `${bytedanceDomains.join("\n")}\n`, "utf8");
  await writeFile(
    surge4ModulePath,
    renderSurge4Module(allDomains, opts.cnDoh, bytedanceDomains, opts.bytedanceDoh),
    "utf8"
  );
  await writeFile(
    mappingModulePath,
    renderMappingModule(opts.repo, modulesDir, opts.cnDoh, opts.bytedanceDoh),
    "utf8"
  );
  await writeFile(modulesReadmePath, renderModulesReadme(opts.repo, modulesDir), "utf8");

  console.log(`generated ${chinaDomainsPath} with ${allDomains.length} domains`);
  console.log(`generated ${bytedanceDomainsPath} with ${bytedanceDomains.length} domains`);
  console.log(`generated ${surge4ModulePath}`);
  console.log(`generated ${mappingModulePath}`);
  console.log(`generated ${modulesReadmePath}`);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const baseContent = await readText(opts.input);
  const domains = extractDomainsFromDnsmasq(baseContent);

  const overrideDomains = opts.overrideFile
    ? sortedUnique(extractDomainsFromPlainList(await readFile(opts.overrideFile, "utf8")))
    : [];

  const allDomains = sortedUnique(domains);

  if (opts.generateAll) {
    await generateAll(opts, allDomains, overrideDomains);
    return;
  }

  await ensureParent(opts.output);

  if (opts.mode === "mapping") {
    await writeFile(
      opts.output,
      renderMappingModule(opts.repo, opts.modulesDir, opts.cnDoh, opts.bytedanceDoh),
      "utf8"
    );
    console.log(`generated mapping module ${opts.output}`);
    return;
  }

  const singleBytedance = sortedUnique([...DEFAULT_BYTEDANCE_DOMAINS, ...overrideDomains]);
  const output = renderSurge4Module(allDomains, opts.cnDoh, singleBytedance, opts.bytedanceDoh);
  await writeFile(opts.output, output, "utf8");
  console.log(
    `generated ${opts.output} with ${allDomains.length} china domains and ${singleBytedance.length} bytedance domains`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
