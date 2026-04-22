# Modules

- `cn-dns-split.sgmodule`: Vendor-merged expanded [Host] mappings for Surge 4.x (no RULE-SET).
- `cn-dns-mapping.sgmodule`: DOMAIN-SET based Local DNS Mapping for Surge iOS 5.17+ / Mac 5.10+.

## Suggested Subscriptions

- Expanded (Surge 4.x): https://cdn.jsdelivr.net/gh/Teakowa/cn-dns-module@main/modules/cn-dns-split.sgmodule
- Mapping (Surge 5.17+): https://cdn.jsdelivr.net/gh/Teakowa/cn-dns-module@main/modules/cn-dns-mapping.sgmodule

## Domain Lists

- China domains: https://cdn.jsdelivr.net/gh/Teakowa/cn-dns-module@main/modules/china-domains.txt
- ByteDance domains: https://cdn.jsdelivr.net/gh/Teakowa/cn-dns-module@main/modules/bytedance-domains.txt
- Apple domains (upstream): https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Surge/Apple/Apple_Domain.list

## Notes

- Surge 4.x module intentionally expands only vendor-classified domains to keep file size controllable.
- Surge 4.x module expands Apple domains from the external Apple_Domain.list source.
- Surge 5.17+ module keeps full coverage via DOMAIN-SET and directly references Apple_Domain.list.
