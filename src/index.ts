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

type VendorConfig = {
  key: string;
  displayName: string;
  server: string;
  keywords: string[];
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
  "ixigua.com",
  "snssdk.com",
  "toutiao.com",
  "toutiaocloud.com",
  "volccdn.com",
  "volces.com",
];

const VENDOR_CONFIGS: VendorConfig[] = [
  {
    key: "bytedance",
    displayName: "ByteDance",
    server: "https://doh.pub/dns-query",
    keywords: [
      "amemv",
      "bytedance",
      "byteimg",
      "doubao",
      "douyin",
      "ibytedtos",
      "ixigua",
      "snssdk",
      "toutiao",
      "volc",
    ],
  },
  {
    key: "tencent",
    displayName: "Tencent",
    server: "https://doh.pub/dns-query",
    keywords: ["myqcloud", "qcloud", "qpic", "qq", "gtimg", "wechat", "weixin", "tencent"],
  },
  {
    key: "alibaba",
    displayName: "Alibaba",
    server: "https://dns.alidns.com/dns-query",
    keywords: ["alibaba", "alicdn", "aliyun", "taobao", "tmall", "alipay", "amap"],
  },
  {
    key: "bilibili",
    displayName: "Bilibili",
    server: "https://doh.pub/dns-query",
    keywords: ["bilibili", "hdslb"],
  },
  {
    key: "xiaomi",
    displayName: "Xiaomi",
    server: "https://doh.pub/dns-query",
    keywords: ["xiaomi", "miui", "mi.com"],
  },
  {
    key: "baidu",
    displayName: "Baidu",
    server: "180.76.76.76",
    keywords: ["baidu", "bdimg"],
  },
  {
    key: "qihoo360",
    displayName: "Qihoo360",
    server: "https://doh.360.cn/dns-query",
    keywords: ["360.cn", "qihoo", "qhimg", "qhres", "hoowu"],
  },
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

function classifyVendors(domains: string[]): Map<string, Set<string>> {
  const grouped = new Map<string, Set<string>>();
  for (const cfg of VENDOR_CONFIGS) {
    grouped.set(cfg.key, new Set<string>());
  }

  for (const domain of domains) {
    for (const cfg of VENDOR_CONFIGS) {
      if (cfg.keywords.some((k) => domain.includes(k))) {
        grouped.get(cfg.key)?.add(domain);
        break;
      }
    }
  }

  return grouped;
}

function renderSurge4Module(grouped: Map<string, Set<string>>): string {
  const lines: string[] = [
    "#!name=CN DNS Split",
    "#!desc=Expanded vendor-based Local DNS Mapping for Surge 4.x (self-contained)",
    "",
    "[Host]",
    "dns.alidns.com = 223.5.5.5, 223.6.6.6, 2400:3200:baba::1, 2400:3200::1",
    "dot.pub = server:119.29.29.29",
    "doh.pub = server:119.29.29.29",
    "dns.pub = server:119.29.29.29",
    "doh.360.cn = server:101.198.198.198",
    "*.m2m = server:system",
    "injections.adguard.org = server:system",
    "local.adguard.org = server:system",
    "*.bogon = server:system",
    "*.local = server:null",
  ];

  for (const cfg of VENDOR_CONFIGS) {
    const domains = sortedUnique(grouped.get(cfg.key) ?? []);
    if (domains.length === 0) {
      continue;
    }

    lines.push("", `# ${cfg.displayName}`);
    for (const domain of domains) {
      lines.push(`${domain} = server:${cfg.server}`);
      lines.push(`*.${domain} = server:${cfg.server}`);
    }
  }

  lines.push("");
  return lines.join("\n");
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
    "- `cn-dns-split.sgmodule`: Vendor-merged expanded [Host] mappings for Surge 4.x (no RULE-SET).",
    "- `cn-dns-mapping.sgmodule`: DOMAIN-SET based Local DNS Mapping for Surge iOS 5.17+ / Mac 5.10+.",
    "",
    "## Suggested Subscriptions",
    "",
    `- Expanded (Surge 4.x): ${base}/cn-dns-split.sgmodule`,
    `- Mapping (Surge 5.17+): ${base}/cn-dns-mapping.sgmodule`,
    "",
    "## Domain Lists",
    "",
    `- China domains: ${base}/china-domains.txt`,
    `- ByteDance domains: ${base}/bytedance-domains.txt`,
    "",
    "## Notes",
    "",
    "- Surge 4.x module intentionally expands only vendor-classified domains to keep file size controllable.",
    "- Surge 5.17+ module keeps full coverage via DOMAIN-SET.",
    "",
  ].join("\n");
}

function buildStats(
  allDomainCount: number,
  grouped: Map<string, Set<string>>,
  splitLineCount: number
): string {
  const vendorCounts: Record<string, number> = {};
  for (const cfg of VENDOR_CONFIGS) {
    vendorCounts[cfg.key] = grouped.get(cfg.key)?.size ?? 0;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    totalChinaDomains: allDomainCount,
    vendorCounts,
    splitModuleLineCount: splitLineCount,
  };

  return JSON.stringify(payload, null, 2) + "\n";
}

async function ensureParent(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

async function generateAll(opts: Options, allDomains: string[], overrideDomains: string[]): Promise<void> {
  const modulesDir = opts.modulesDir;
  await mkdir(modulesDir, { recursive: true });

  const grouped = classifyVendors(allDomains);
  const bytedanceSet = grouped.get("bytedance") ?? new Set<string>();
  for (const domain of [...DEFAULT_BYTEDANCE_DOMAINS, ...overrideDomains]) {
    bytedanceSet.add(normalizeDomain(domain));
  }
  grouped.set("bytedance", bytedanceSet);

  const bytedanceDomains = sortedUnique(bytedanceSet);
  const chinaDomainsPath = `${modulesDir}/china-domains.txt`;
  const bytedanceDomainsPath = `${modulesDir}/bytedance-domains.txt`;
  const surge4ModulePath = `${modulesDir}/cn-dns-split.sgmodule`;
  const mappingModulePath = `${modulesDir}/cn-dns-mapping.sgmodule`;
  const modulesReadmePath = `${modulesDir}/README.md`;
  const statsPath = `${modulesDir}/stats.json`;

  const surge4Module = renderSurge4Module(grouped);

  await writeFile(chinaDomainsPath, `${allDomains.join("\n")}\n`, "utf8");
  await writeFile(bytedanceDomainsPath, `${bytedanceDomains.join("\n")}\n`, "utf8");
  await writeFile(surge4ModulePath, surge4Module, "utf8");
  await writeFile(
    mappingModulePath,
    renderMappingModule(opts.repo, modulesDir, opts.cnDoh, opts.bytedanceDoh),
    "utf8"
  );
  await writeFile(modulesReadmePath, renderModulesReadme(opts.repo, modulesDir), "utf8");
  await writeFile(statsPath, buildStats(allDomains.length, grouped, surge4Module.split(/\r?\n/).length), "utf8");

  console.log(`generated ${chinaDomainsPath} with ${allDomains.length} domains`);
  console.log(`generated ${bytedanceDomainsPath} with ${bytedanceDomains.length} domains`);
  console.log(`generated ${surge4ModulePath}`);
  console.log(`generated ${mappingModulePath}`);
  console.log(`generated ${modulesReadmePath}`);
  console.log(`generated ${statsPath}`);
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

  const grouped = classifyVendors(allDomains);
  const bytedanceSet = grouped.get("bytedance") ?? new Set<string>();
  for (const domain of [...DEFAULT_BYTEDANCE_DOMAINS, ...overrideDomains]) {
    bytedanceSet.add(normalizeDomain(domain));
  }
  grouped.set("bytedance", bytedanceSet);

  const output = renderSurge4Module(grouped);
  await writeFile(opts.output, output, "utf8");
  console.log(`generated ${opts.output} (vendor-expanded Surge 4.x module)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
