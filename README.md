# cn-dns-module

TypeScript tool that converts `dnsmasq-china-list` style domains into a Surge 4.x module using `[Host]` DNS server mapping.

## Why

Surge Mac 4.x does not support binding `DOMAIN-SET` directly to DNS servers in `[Host]`, so this project generates plain `[Host]` entries.

## Install

```bash
pnpm install
```

## Build

```bash
pnpm build
```

## Generate

```bash
pnpm gen -- --output examples/sample-output.sgmodule
```

Options:

- `--input <file-or-url>`: dnsmasq source (default: official `accelerated-domains.china.conf`)
- `--output <path>`: output module path
- `--cn-doh <url>`: CN DoH endpoint (default: `https://dns.alidns.com/dns-query`)
- `--override-file <path>`: optional extra domains (one domain per line)

## Output Format

The generated file contains:

- module metadata header
- `[Host]` section
- two mappings per domain:
  - `domain = server:<CN_DOH>`
  - `*.domain = server:<CN_DOH>`
