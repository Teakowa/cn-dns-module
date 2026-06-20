# cn-dns-module

TypeScript generator for Egern rule sets and frozen Surge DNS modules.

Maintained outputs:

- `china-domains.egern.yaml`: full China domain `domain_suffix_set` for Egern
- `bytedance-domains.egern.yaml`: ByteDance `domain_suffix_set` for Egern

Frozen outputs kept for existing users:

- `cn-dns-split.sgmodule`: vendor-merged expanded `[Host]` mappings for Surge 4.x
- `cn-dns-mapping.sgmodule`: `DOMAIN-SET` Local DNS Mapping for Surge iOS 5.17+ / Mac 5.10+

Surge artifacts are no longer maintained. New usage should target Egern.

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
- `modules/china-domains.egern.yaml`
- `modules/bytedance-domains.egern.yaml`
- `modules/cn-dns-split.sgmodule`
- `modules/cn-dns-mapping.sgmodule`
- `modules/stats.json`
- `modules/README.md`

## Single-file generation

```bash
node dist/index.js --mode egern --output examples/sample-output.egern.yaml
node dist/index.js --mode mapping --output examples/mapping-output.sgmodule --repo Teakowa/cn-dns-module --modules-dir modules
```

## Optional arguments

- `--input <file-or-url>`
- `--mode <surge4|mapping|egern>`
- `--cn-doh <url>`
- `--bytedance-doh <url>`
- `--override-file <path>` (extra domains appended to ByteDance list)
