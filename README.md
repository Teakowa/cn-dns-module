# cn-dns-module

TypeScript generator for Egern modules, Egern rule sets, and frozen Surge DNS modules.

Maintained Egern entrypoint:

- `cn-dns.egern.module.yaml`: Egern module that wires the maintained rule sets into `rules:`

Maintained Egern rule sets:

- `china-domains.egern.yaml`: full China domain `domain_suffix_set` for Egern
- `bytedance-domains.egern.yaml`: ByteDance `domain_suffix_set` for Egern

Frozen outputs kept for existing users:

- `cn-dns-split.sgmodule`: vendor-merged expanded `[Host]` mappings for Surge 4.x
- `cn-dns-mapping.sgmodule`: `DOMAIN-SET` Local DNS Mapping for Surge iOS 5.17+ / Mac 5.10+

Surge artifacts are no longer maintained. New usage should target the Egern module.

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
- `modules/cn-dns.egern.module.yaml`
- `modules/china-domains.egern.yaml`
- `modules/bytedance-domains.egern.yaml`
- `modules/cn-dns-split.sgmodule`
- `modules/cn-dns-mapping.sgmodule`
- `modules/stats.json`
- `modules/README.md`

## Single-file generation

```bash
node dist/index.js --mode egern --output examples/sample-output.egern.module.yaml
node dist/index.js --mode mapping --output examples/mapping-output.sgmodule --repo Teakowa/cn-dns-module --modules-dir modules
```

`--mode egern` generates the Egern module. The `.egern.yaml` rule-set files remain available as module dependencies and for manual composition.

## Optional arguments

- `--input <file-or-url>`
- `--mode <surge4|mapping|egern>`
- `--cn-doh <url>`
- `--bytedance-doh <url>`
- `--override-file <path>` (extra domains appended to ByteDance list)
