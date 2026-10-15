# @riftlog/web

The riftlog.net marketing site: a one-pager with the waitlist, plus the
privacy, terms and impressum pages. Next.js 16, Tailwind CSS v4.

```bash
pnpm --filter @riftlog/web dev          # http://localhost:3000
pnpm --filter @riftlog/web build
pnpm --filter @riftlog/web screenshots  # screenshots-raw/*.png → public/screenshots/
pnpm --filter @riftlog/web icons        # favicon, app icon, splash (web + mobile)
```

Copy `.env.example` to `.env.local` for the waitlist. Conventions and
structure are in [CLAUDE.md](./CLAUDE.md).
