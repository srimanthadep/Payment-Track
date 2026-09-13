# 🐴 ponytail-audit: Payment-Track

> [!NOTE]
> Over-engineering and complexity only. Correctness, security, and performance are out of scope.

---

## Findings (ranked: biggest cut first)

| # | Tag | What to cut | Replacement | Path |
|---|-----|-------------|-------------|------|
| 1 | `delete:` | **13 ghost Radix/UI deps** — `react-accordion`, `react-aspect-ratio`, `react-collapsible`, `react-context-menu`, `react-hover-card`, `react-menubar`, `react-navigation-menu`, `react-radio-group`, `react-toggle-group`, `embla-carousel-react`, `react-resizable-panels`, `vaul`, `cmdk`. Installed, zero imports anywhere. | `npm uninstall` them. | [package.json](file:///C:/Users/srima/Downloads/Payment-Track/frontend/package.json#L18-L50) |
| 2 | `delete:` | **Dual toast system** — `use-toast.ts` (187 lines), `toast.tsx` (112 lines), `toaster.tsx` (25 lines) are shadcn's heavy Radix-based toast with a hand-rolled reducer+pub/sub. App also mounts Sonner (`<Toaster />` + `<Sonner />`). Both render simultaneously in `App.tsx`. Pick one. | Keep Sonner (already used). Replace 28 `useToast()` call sites with `import { toast } from "sonner"`. Delete the 3 files + `@radix-ui/react-toast` dep. **~324 lines.** | [use-toast.ts](file:///C:/Users/srima/Downloads/Payment-Track/frontend/src/hooks/use-toast.ts), [toast.tsx](file:///C:/Users/srima/Downloads/Payment-Track/frontend/src/components/ui/toast.tsx), [toaster.tsx](file:///C:/Users/srima/Downloads/Payment-Track/frontend/src/components/ui/toaster.tsx), [App.tsx:54-55](file:///C:/Users/srima/Downloads/Payment-Track/frontend/src/App.tsx#L54-L55) |
| 3 | `delete:` | **Duplicate backend** — Edge Function `admin-create-user/index.ts` (77 lines) is 100% duplicated by `server.js` (144 lines). Express even mounts `/functions/v1/admin-create-user` to mimic it. Two deployment targets doing one thing. | Pick one. If using Render → keep `server.js`, delete Edge Function. If using Supabase Edge → delete `server.js`. | [server.js](file:///C:/Users/srima/Downloads/Payment-Track/backend/server.js), [index.ts](file:///C:/Users/srima/Downloads/Payment-Track/backend/supabase/functions/admin-create-user/index.ts) |
| 4 | `delete:` | **`pg` + `@types/pg` in frontend** — Node.js PostgreSQL driver declared as frontend browser dependency. Can't run in browsers. Never imported. | `npm uninstall pg @types/pg` from frontend. | [package.json:47,60](file:///C:/Users/srima/Downloads/Payment-Track/frontend/package.json#L47-L60) |
| 5 | `delete:` | **`pg` in backend** — declared in deps, never `require()`'d. All DB goes through Supabase client. | `npm uninstall pg` from backend. | [package.json:15](file:///C:/Users/srima/Downloads/Payment-Track/backend/package.json#L15) |
| 6 | `delete:` | **`html2canvas`** — in `package.json` deps and `vite.config.ts` manualChunks, but zero imports in any source file. | `npm uninstall html2canvas`, remove from manualChunks. | [package.json:54](file:///C:/Users/srima/Downloads/Payment-Track/frontend/package.json#L54), [vite.config.ts:82](file:///C:/Users/srima/Downloads/Payment-Track/frontend/vite.config.ts#L82) |
| 7 | `delete:` | **`react-pull-to-refresh`** — installed but the app uses a hand-written `PullToRefresh.tsx` component with touch events + framer-motion. | `npm uninstall react-pull-to-refresh`. | [package.json:66](file:///C:/Users/srima/Downloads/Payment-Track/frontend/package.json#L66) |
| 8 | `delete:` | **`next-themes`** — only imported in `sonner.tsx` for `useTheme()` which falls back to `"system"` since no `ThemeProvider` is mounted. App uses custom `themeService.ts`. | Hardcode `theme="system"` in `sonner.tsx`, `npm uninstall next-themes`. | [sonner.tsx:1](file:///C:/Users/srima/Downloads/Payment-Track/frontend/src/components/ui/sonner.tsx#L1), [themeService.ts](file:///C:/Users/srima/Downloads/Payment-Track/frontend/src/services/themeService.ts) |
| 9 | `delete:` | **Dead UI wrapper: `toggle.tsx`** — shadcn Toggle component wrapping `@radix-ui/react-toggle`. Never imported by any component. | Delete file + `npm uninstall @radix-ui/react-toggle`. **~38 lines.** | [toggle.tsx](file:///C:/Users/srima/Downloads/Payment-Track/frontend/src/components/ui/toggle.tsx) |
| 10 | `delete:` | **Dead UI wrapper: `alert.tsx`** — shadcn Alert component. Never imported by any component. | Delete file. **~37 lines.** | [alert.tsx](file:///C:/Users/srima/Downloads/Payment-Track/frontend/src/components/ui/alert.tsx) |
| 11 | `delete:` | **Duplicate docs** — `DATABASE_SCHEMA.json` (152 lines) duplicates `DATABASE_SCHEMA.md` (268 lines). Two manual copies of the same 10-table schema. | Keep `.md`, delete `.json`. Or auto-generate one from the other. **~152 lines.** | [DATABASE_SCHEMA.json](file:///C:/Users/srima/Downloads/Payment-Track/docs/DATABASE_SCHEMA.json) |
| 12 | `delete:` | **Duplicate `vercel.json`** — `frontend/vercel.json` duplicates rewrites+headers from root `vercel.json`. Only one is active depending on Vercel root directory config. | Keep one. Delete the other. | [frontend/vercel.json](file:///C:/Users/srima/Downloads/Payment-Track/frontend/vercel.json), [vercel.json](file:///C:/Users/srima/Downloads/Payment-Track/vercel.json) |
| 13 | `delete:` | **Orphan migration script** — `drop_scraping.sql` is a one-shot DDL left behind after removing a scraping feature. | Delete. **~11 lines.** | [drop_scraping.sql](file:///C:/Users/srima/Downloads/Payment-Track/backend/supabase/drop_scraping.sql) |
| 14 | `delete:` | **Dead Supabase config entries** — `config.toml` defines `send-otp` and `verify-otp` functions that don't exist. Doesn't define `admin-create-user` which does. Project ID mismatch with `functions.env`. | Remove phantom function defs, fix or delete `config.toml`. | [config.toml](file:///C:/Users/srima/Downloads/Payment-Track/backend/supabase/config.toml) |
| 15 | `delete:` | **Empty root `package-lock.json`** — 211 bytes locking zero packages. Generated by accident from a deps-free root `package.json`. | Delete. | [package-lock.json](file:///C:/Users/srima/Downloads/Payment-Track/package-lock.json) |
| 16 | `yagni:` | **Manual chunk splitting** — `vite.config.ts` manually partitions 6 chunk groups (`vendor`, `charts`, `export`, `animations`, `supabase`, `ui`). Vite already code-splits automatically. Manual chunks cause fragile coupling and reference the dead `html2canvas`. | Delete `manualChunks` block. Let Vite handle it. **~9 lines config.** | [vite.config.ts:77-88](file:///C:/Users/srima/Downloads/Payment-Track/frontend/vite.config.ts#L77-L88) |
| 17 | `yagni:` | **Supabase API service worker caching** — `NetworkFirst` with 24h TTL for `.supabase.co` API requests. Caching dynamic relational DB responses in a SW risks stale data in a financial app. | Remove the `runtimeCaching` block. **~13 lines config.** | [vite.config.ts:54-66](file:///C:/Users/srima/Downloads/Payment-Track/frontend/vite.config.ts#L54-L66) |
| 18 | `yagni:` | **4-job CI with 4× `npm ci`** — lint, build, type-check, security each spin up a separate VM and install all deps from scratch. For a single-person repo. | Combine into 1–2 jobs. One `npm ci`, sequential steps. **Saves ~3 minutes per CI run.** | [ci.yml](file:///C:/Users/srima/Downloads/Payment-Track/.github/workflows/ci.yml) |
| 19 | `yagni:` | **CI `continue-on-error: true`** on lint and security — makes those checks decorative. They pass even when they fail. | Remove `continue-on-error: true`. Fix any real lint/audit warnings. | [ci.yml](file:///C:/Users/srima/Downloads/Payment-Track/.github/workflows/ci.yml) |
| 20 | `yagni:` | **ESLint disables `no-unused-vars`** — `@typescript-eslint/no-unused-vars: "off"` repo-wide masks dead imports and variables, the exact thing this audit hunts. | Set to `"warn"` or `"error"`. Fix the warnings. | [eslint.config.js](file:///C:/Users/srima/Downloads/Payment-Track/frontend/eslint.config.js) |
| 21 | `yagni:` | **Dead Tailwind content paths** — `./pages/**`, `./components/**`, `./app/**` in `content` glob. These directories don't exist at the frontend root (everything is under `./src/`). Leftover from a Next.js boilerplate. | Remove the 3 dead globs. `./src/**/*.{ts,tsx}` already covers everything. | [tailwind.config.ts](file:///C:/Users/srima/Downloads/Payment-Track/frontend/tailwind.config.ts) |
| 22 | `yagni:` | **69-line PR template + 3 issue templates** — migration guides, browser testing matrix, breaking changes checklist for a small/solo repo. | Trim to essentials or delete. | [.github/](file:///C:/Users/srima/Downloads/Payment-Track/.github) |
| 23 | `yagni:` | **`@hookform/resolvers` + `zod`** — installed for form validation but check if `react-hook-form` + inline validation would suffice (both are used, keeping for reference — verify actual resolver usage). | Verify: if only `z.object()` schemas with `zodResolver`, may be justified. | [package.json:17,75](file:///C:/Users/srima/Downloads/Payment-Track/frontend/package.json#L17-L75) |

---

## Summary

```
net: ~600 lines code, ~200 lines config, ~150 lines docs deletable.
     -18 npm deps possible (13 ghost Radix, pg×3, html2canvas, 
      react-pull-to-refresh, next-themes, @radix-ui/react-toggle,
      @radix-ui/react-toast).
```

> [!TIP]
> Biggest wins: nuke the 13 ghost Radix deps (one `npm uninstall` command), consolidate the dual toast system (~324 lines), and pick one backend deployment target (~77–144 lines).
