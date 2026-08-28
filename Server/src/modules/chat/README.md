# Chat module (`/api/chat`, client `/chat`)

Standalone chat next to the listing messenger — separate collections, own database,
own client route + header. Not registered in Swagger on purpose.

## Env

| var | purpose |
|---|---|
| `CHAT_MONGODB_URL` | chat database (rooms, messages, image files). Empty → uses `MONGODB_URL`. Users/auth always come from the main DB. |
| `CHAT_ENCRYPTION_KEY` | key material for AES-256-GCM (any string; `dev-chat-key-change-me` outside production). Rotating it makes old messages unreadable. |

## Data

- `chat_rooms` — `type` direct/group, `members[{user, role, lastReadAt}]`, `lastMessage` (encrypted preview).
- `chat_messages` — `type` text/image/sticker/system, `content` = `{iv, tag, data}` (AES-256-GCM), `recalled`.
- `chat_images.*` (GridFS) — image bytes encrypted before upload; `iv/tag/contentType` in metadata.

Images are served from `GET /api/chat/images/:id?exp&sig` — an HMAC-signed URL valid for
1 hour that `<img>` can load without a bearer token; anything else on the router requires
`Authorization: Bearer`.

## Routes

`GET rooms` · `POST rooms/direct {userId}` · `POST rooms/group {name, memberIds}` · `GET/PATCH rooms/:id` ·
`POST rooms/:id/members {memberIds}` · `PATCH rooms/:id/members/:userId {role: admin|member}` (owner) · `DELETE rooms/:id/members/:userId` (leave = your own id) ·
`GET rooms/:id/messages?limit&before` · `POST rooms/:id/messages {content}` · `POST rooms/:id/stickers {sticker}` ·
`POST rooms/:id/images (multipart image ≤ 5 MB, optional replyTo)` · `POST rooms/:id/read` · `POST messages/:id/recall` (sender only) ·
`POST messages/:id/react {emoji}` (toggle) · text/sticker bodies accept `replyTo` ·
`GET users?q=` (member search).

Sockets (existing server, events prefixed `chat:`): `chat:message`, `chat:room`, `chat:typing`.

## Stickers

Add your own pack: create `client/public/stickers/<id>/`, drop `.webp/.gif/.png` files in it (optional
`pack.json` with `{ "name": "..." }`), then `node scripts/chat/build-sticker-packs.js` to refresh `packs.json`.

Set `TENOR_API_KEY` (free, https://developers.google.com/tenor) to add a **GIF** tab to the sticker tray:
transparent animated stickers searched through Tenor (`GET /api/chat/stickers/search?q=`, key stays
server-side). A picked sticker is stored as its `media.tenor.com` URL.

`client/public/stickers/packs.json` lists the packs: `animated/` (Google Noto Animated Emoji, WebP)
and `3d/` (Microsoft Fluent Emoji 3D, PNG) — both open-licensed and served locally. A message
stores only the id `"<pack>/<name>"`.

## Switching to the separate database

1. Set `CHAT_MONGODB_URL` in `.env`.
2. `node scripts/chat/move-to-chat-db.js --drop` — copies `chat_rooms`, `chat_messages`, `chat_images.*`
   from the main database and drops them there (omit `--drop` to only copy).
3. Restart the server; the boot log prints `Chat database connected (<name>)`.

## Seed

`node scripts/chat/seed-chat-users.js` → users Tin, Nam, Phuoc, Ha, DDD (`<name>@chat.dev` / `123456`)
and the group "Nhóm 5 anh em" with a few encrypted messages.
