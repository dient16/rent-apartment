# Vietnam administrative units (after 2025-07-01)

Resolution 1171/NQ-UBTVQH15 and related resolutions merged 63 provinces into 34 and removed the
district level. These files are the app's offline copy of that structure.

| file | rows | content |
|---|---|---|
| `provinces.json` | 34 | new provinces / centrally-run cities |
| `wards.json` | 3321 | new wards / communes with `province_code` |
| `mapping-old-to-new.json` | ~10k | old (province, district, ward) -> new (province, ward) |
| `legacy-gso-2024.json` | 63 / 705 / 10.6k | old GSO codes -> names, used to decode records that stored codes instead of names |

Source: VietMap <https://github.com/vietmap-company/vietnam_administrative_address> (VietMap Administrative
Data License, October 2025 snapshot). Legacy codes come from the client's pre-merger dataset
(`Client/src/utils/location/*.ts`, provinces.open-api.vn v1).

Used by `src/scripts/migrateAddresses2025.ts`.
