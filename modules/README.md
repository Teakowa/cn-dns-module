# Modules

- `china-domains.egern.yaml`: Egern `domain_suffix_set` rule set for the full China domain list.
- `bytedance-domains.egern.yaml`: Egern `domain_suffix_set` rule set for ByteDance domains.
- `cn-dns-split.sgmodule`: Frozen Surge 4.x expanded [Host] mappings. Unmaintained.
- `cn-dns-mapping.sgmodule`: Frozen Surge 5.17+ DOMAIN-SET mapping module. Unmaintained.

## Suggested Subscriptions

- Egern China rule set: https://cdn.jsdelivr.net/gh/Teakowa/cn-dns-module@main/modules/china-domains.egern.yaml
- Egern ByteDance rule set: https://cdn.jsdelivr.net/gh/Teakowa/cn-dns-module@main/modules/bytedance-domains.egern.yaml
- Surge 4.x (frozen): https://cdn.jsdelivr.net/gh/Teakowa/cn-dns-module@main/modules/cn-dns-split.sgmodule
- Surge 5.17+ (frozen): https://cdn.jsdelivr.net/gh/Teakowa/cn-dns-module@main/modules/cn-dns-mapping.sgmodule

## Domain Lists

- China domains: https://cdn.jsdelivr.net/gh/Teakowa/cn-dns-module@main/modules/china-domains.txt
- ByteDance domains: https://cdn.jsdelivr.net/gh/Teakowa/cn-dns-module@main/modules/bytedance-domains.txt
- Apple domains (upstream): https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Surge/Apple/Apple_Domain.list

## Notes

- Egern rule sets are the maintained output format for this repository.
- Surge artifacts are kept for existing subscribers but are no longer actively maintained.
- Surge 4.x module intentionally expands only vendor-classified domains to keep file size controllable.
- Surge 4.x module expands Apple domains from the external Apple_Domain.list source.
- Surge 5.17+ module keeps full coverage via DOMAIN-SET and directly references Apple_Domain.list.
