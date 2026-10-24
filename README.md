# Tamable Astro blog

An [Astro](https://astro.build) starter for a blog whose posts live in a [Tamable](https://tamable.app) workspace. You write, review and publish in Tamable; this site renders what you published and rebuilds itself when something changes.

It gives you:

- Posts at `/blog/{slug}`, with tags, series, reading time, cover images and the SEO fields you set in Tamable (title, description, canonical URL, Open Graph, JSON-LD)
- Tag pages at `/tags/{tag}` and series pages at `/series` and `/series/{slug}`
- Draft previews at `/preview/{token}`: never cached, never indexed
- An RSS feed (`/rss.xml`), a sitemap and `robots.txt`
- 301 redirects for posts you renamed in Tamable, and optionally for the addresses of an old Ghost blog
- A deploy webhook that checks Tamable's signature before asking your host to rebuild
- Light and dark themes, both driven by CSS variables

Pages are prerendered at build time. A small Node server handles only previews and the deploy webhook. Everything Tamable-specific (the API client, mapping, feeds, redirects, the webhook check and a fake Tamable) comes from [`@tamable/blog-kit`](https://github.com/tamable-app/blog-kit).

## Quick start

You need Node 22.23.4 or newer.

```sh
npm install
cp .env.example .env   # then fill it in, see below
npm run dev            # http://localhost:4321
```

## Try it with the fake Tamable

You don't need a Tamable workspace to try the starter. The kit ships a fake read API that serves a few made-up posts:

```sh
npm run fake-tamable &
TAMABLE_API_URL=http://localhost:4010/api/v1 TAMABLE_READ_KEY=fixture npm run dev
```

`/preview/ok/with/slash/` shows a draft preview. Build and start the site with the same variables (`npm run build && npm start`) and `/blog/old-name` redirects to `/blog/hello-world`, as a renamed post would.

## Connect it to Tamable

In Tamable, go to **Settings › Sites** (you need to be a workspace owner) and create a site:

| Field | Value |
|---|---|
| Address | `https://yourblog.com` |
| Blog URL pattern | `/blog/{slug}` |
| Preview URL pattern | `https://yourblog.com/preview/{token}` |
| Deploy webhook | `https://yourblog.com/api/deploy` |

Then, on the same page:

1. Create a **read key**. It's shown once: put it in `TAMABLE_READ_KEY`.
2. Copy the deploy webhook's **signing secret** into `TAMABLE_WEBHOOK_SECRET`.

Tamable's [read API guide](https://github.com/tamable-app/tamable/blob/main/docs/read-api.md) covers the API, previews and the webhook in detail.

## Environment variables

Set these on your host. They're read when the site builds and when the server starts. The first four are [`astro:env`](https://docs.astro.build/en/guides/environment-variables/) server secrets: none of them ends up in browser code or is baked into the build.

| Variable | What it is |
|---|---|
| `TAMABLE_READ_KEY` | The site's read key. Keep it out of the repo |
| `TAMABLE_WEBHOOK_SECRET` | The deploy webhook's signing secret |
| `DEPLOY_HOOK_URL` | Your host's build hook: a URL that starts a new build when called with `POST` (Forge, Netlify, Vercel, Cloudflare Pages...) |
| `TAMABLE_API_URL` | Only if you don't use `https://api.tamable.app/api/v1` |
| `SITE_URL` | The canonical address, with no trailing slash. Falls back to `url` in `site.config.ts` |
| `ALLOW_EMPTY_BLOG` | `true` to allow a build with no published posts. By default the build stops instead, so a misconfigured key can't publish an empty blog |

## How publishing works

1. You publish a post in Tamable, publish changes to one, or delete one.
2. About a minute later, once you've stopped making changes, Tamable calls `/api/deploy` with a signed request.
3. The site checks the signature and the timestamp, then calls `DEPLOY_HOOK_URL`.
4. Your host builds the site, which reads every published post from Tamable and prerenders the pages.

If the build fails, your host keeps serving the previous version. It's also worth scheduling a nightly call to the build hook, to catch anything a webhook missed.

You can point Tamable's deploy webhook straight at your host's build hook instead. That's simpler, but anyone who learns the hook's URL can trigger builds; going through `/api/deploy` means only Tamable can.

## Redirects and trailing slashes

Redirects are worked out once, when the site builds, so the live server never asks Tamable about them:

- `integrations/tamable.ts` reads Tamable's posts and renamed posts, turns them into a list of 301s with the kit's `buildRedirects` and hands it to Astro's `redirects` option. With `ghostRedirects: true` in `site.config.ts`, the list also covers an old Ghost blog's post, tag and feed addresses. The same step stops the build when there are no published posts.
- Every page has one address, without a trailing slash. Prerendered pages are files the Node server serves itself, and with `trailingSlash: 'never'` it answers `/blog/` with a 301 to `/blog`. Every other request goes through `src/fetch.ts` first, which removes the slash before Astro routes it (going straight to a renamed post's new address, in one hop) and, when moving from Ghost, sends old tag and author pages to `/blog` and `/about`.
- Previews are left alone, since a preview token can end in a slash.

## Make it yours

- **Name, author and links:** `site.config.ts`. This is also where you turn on Ghost redirects if you're moving from Ghost.
- **Colors, fonts and sizes:** `src/styles/tokens.css`. Every color comes from a variable there, for light and dark. Inter and JetBrains Mono are self-hosted from Fontsource and imported in `src/layouts/Layout.astro`.
- **Post body styles:** `src/styles/prose.css`. In development, `/dev/blocks` shows every block Tamable can send.
- **About page:** `src/pages/about.astro`.
- **Header links:** `src/components/SiteHeader.astro`.

## Deploying

Any host that runs Node works: build with `npm run build`, then start `dist/server/entry.mjs` (or `npm start`). `HOST` and `PORT` choose where it listens.

On Laravel Forge with PM2, give Node the absolute path to the environment file. PM2 in cluster mode starts Node from its own working directory, so a relative `--env-file=.env` can stop working after the site's folder changes:

```json
{ "name": "blog", "cwd": "/home/forge/yourblog.com/current", "script": "./dist/server/entry.mjs", "node_args": "--env-file=/home/forge/yourblog.com/.env", "instances": 2, "exec_mode": "cluster" }
```

A static host can serve `dist/client` on its own, but the two on-demand routes, `/preview/[...token]` and `/api/deploy`, need a server. Either swap `@astrojs/node` for your host's adapter (Netlify, Vercel and Cloudflare run them as functions), or delete those two files and point Tamable's deploy webhook straight at the host's build hook. Redirects and trailing slashes then follow your host's rules.

## Development

| Command | Does |
|---|---|
| `npm run dev` | Development server, reading Tamable on every request |
| `npm run lint` | ESLint |
| `npm run typecheck` | `astro check` |
| `npm test` | Vitest |
| `npm run build` | Prerenders the site into `dist` |
| `npm start` | Serves `dist` (preview and webhook routes included) |
| `npm run fake-tamable` | The fake Tamable on port 4010, read key `fixture` |

CI runs lint, type check and tests, then builds against the fake Tamable, so it never needs a read key.

## License

MIT
