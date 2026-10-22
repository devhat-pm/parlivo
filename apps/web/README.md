# @parlivo/web

The Next.js (App Router) web app: SSR marketing and auth pages, and the client-only dashboard, lobby and in-call screens. The same code is built as a static export (`output: 'export'`) for the Tauri desktop shell, so anything the desktop needs must not depend on SSR (ARCHITECTURE.md section 6).

Placeholder only: one page that proves the Next.js build and the `@parlivo/ui` workspace link. `pnpm --filter @parlivo/web dev | build | lint | typecheck | test`.
