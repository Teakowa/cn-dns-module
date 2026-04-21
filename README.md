# cn-dns-module

TypeScript generator for Surge DNS modules.

It generates two module styles:

- `cn-dns-split.sgmodule`: vendor-merged expanded `[Host]` mappings for Surge 4.x (no `RULE-SET` / `DOMAIN-SET`)
- `cn-dns-mapping.sgmodule`: `DOMAIN-SET` Local DNS Mapping for Surge iOS 5.17+ / Mac 5.10+

`DOMAIN-SET` URLs use jsDelivr CDN acceleration.

## Install

```bash
pnpm install
```

## Build

```bash
pnpm run build
```

## Generate all production artifacts

```bash
pnpm run generate:all
```

Generated outputs:

- `modules/china-domains.txt`
- `modules/bytedance-domains.txt`
- `modules/cn-dns-split.sgmodule`
- `modules/cn-dns-mapping.sgmodule`
- `modules/stats.json`
- `modules/README.md`

## Single-file generation

```bash
node dist/index.js --mode surge4 --output examples/sample-output.sgmodule
node dist/index.js --mode mapping --output examples/mapping-output.sgmodule --repo Teakowa/cn-dns-module --modules-dir modules
```

## Optional arguments

- `--input <file-or-url>`
- `--cn-doh <url>`
- `--bytedance-doh <url>`
- `--override-file <path>` (extra domains appended to ByteDance list)
