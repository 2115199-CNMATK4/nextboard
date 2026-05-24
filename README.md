# NextBoard

Realtime collaborative whiteboard — Next.js 16 (App Router) + Supabase (Auth / Postgres / Realtime / RLS) + react-konva.

Người dùng tạo board, vẽ text/rect/ellipse/line/arrow/freehand; các thay đổi broadcast gần thời gian thực giữa nhiều tab/thiết bị/user. Có guest mode local-only, device profile, temporary object lock và admin dashboard.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4
- Supabase (Auth + Postgres + Realtime Broadcast/Presence + RLS)
- react-konva (canvas)

## Development

```bash
cp .env.example .env.local   # fill Supabase keys
npm install
npm run dev                  # http://localhost:3000
```

Lệnh khác:

- `npm run build` / `npm start` — build & serve production
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type check

Migration SQL nằm trong `supabase/migrations/`, apply thủ công bằng Supabase SQL editor (append-only, theo thứ tự).

## Docker (Phase 14)

Image multi-stage tận dụng Next.js `output: 'standalone'` để chỉ ship những file thật sự cần.

```bash
cp .env.example .env         # Compose đọc file này
docker compose up --build -d
# http://localhost:3000
```

Dừng / xem log:

```bash
docker compose logs -f app
docker compose down
```

### Env vars

| Variable | Nơi dùng | Ghi chú |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Inline vào bundle ở **build time** — pass qua compose `build.args` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Inline vào bundle ở **build time** |
| `NEXT_PUBLIC_SITE_URL` | client | Dùng cho redirect auth/email |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | **Không** bake vào image, chỉ inject runtime qua `env_file` |

Đổi giá trị `NEXT_PUBLIC_*` cần `docker compose build --no-cache` lại; đổi service-role key chỉ cần restart container.

## Project layout

```
src/
  app/                       # App Router routes (auth-gated under (app)/)
  actions/                   # Server Actions
  components/                # ui/, board/, admin/, layout/, account/
  hooks/                     # useBoardRealtime, useBoardSync, useObjectLock, ...
  lib/                       # supabase/, queries/, board/, auth/, theme/, utils/
  types/                     # database types (discriminated union for board objects)
supabase/migrations/         # SQL migrations (append-only)
docs/development-log.md      # phase-by-phase decision log
proxy.ts                     # Next.js middleware (root, NOT src/)
```

Xem `CLAUDE.md` cho ràng buộc kiến trúc và `docs/development-log.md` cho lịch sử quyết định.
