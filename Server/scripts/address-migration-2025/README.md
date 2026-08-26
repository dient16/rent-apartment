# Address backfill 2025

Fills `location.current` = `{ province, ward }` in the post-2025-07-01 structure (34 provinces,
no districts) on every apartment. The stored `location.province / district / ward` are left
untouched; search matches both, so guests can type "Bình Định" or "Gia Lai".

New listings get `location.current` on create (`apartment.commands.ts` -> `addressResolver`).
Run this for the existing ones, or again after the mapping data changes:

```
npm run migrate:address-2025                        # dry run - audit + report in ./reports
npm run migrate:address-2025 -- --apply --geocode   # write (Photon settles split wards, ~1 req/s)
npm run migrate:address-2025 -- --force             # recompute listings that already have it
npm run search:reindex                              # only if SEARCH_PROVIDER=elasticsearch
```

Rollback: `db.apartments.updateMany({}, { $unset: { 'location.current': 1, 'location.adminVersion': 1 } })`.

Atlas Search: the index definition gained `location.current.*`; the app only creates the index
when it is missing, so drop `apartments_search` once (Atlas UI) and let the app recreate it.

Resolution logic lives in `src/modules/location/addressResolver.ts`; unit data in
`src/data/vn-admin-2025/`. Statuses: exact / district-single / geocoded (confident),
district-guess (old ward split - first candidate, review), province-only, already-new.
