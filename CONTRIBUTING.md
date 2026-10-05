# Contributing

## Setup

Use Node.js 24 (see `.nvmrc`):

```sh
nvm use
npm install
```

## Architecture

The build outputs four files to `build/prismic-toolbar/<version>/`:

| File                  | Source                         | Loaded                                                |
| --------------------- | ------------------------------ | ----------------------------------------------------- |
| `prismic.js`          | `src/loader`                   | On every page, by the install snippet                 |
| `toolbar.js`          | `src/toolbar/bar`              | Only while a preview session is active                |
| `embedded-preview.js` | `src/toolbar/embedded-preview` | Only inside the Prismic editor's preview iframe       |
| `iframe.html`         | `src/iframe`                   | Hidden, from the repository host, to read its cookies |

Each file is a self-contained classic script. The CDN sends no CORS headers, so lazy bundles load as classic scripts and register on `window.__prismicToolbar`.

`src/core` holds the logic the loader runs:

- `preview-session.ts`: the state machine that keeps the website's preview cookie in sync with the repository's preview session and dispatches preview events.
- `embedded-push.ts`: handles refs the editor pushes into its preview iframe.
- `site-cookie.ts`, `owner-marker.ts`, `cookie-watcher.ts`: the preview cookie, the editor's ownership marker, and change detection across tabs.
- `bridge.ts`, `bridge-protocol.ts`: requests to the repository iframe over a `MessageChannel`.

## Develop

```sh
npm start
npm run serve
```

`npm start` rebuilds on change. `npm run serve` serves the build at `http://localhost:8081/prismic-toolbar/<version>/`. Point a website at your build:

```html
<script src="http://localhost:8081/prismic-toolbar/<version>/prismic.js?repo=YOUR_REPOSITORY"></script>
```

The website then loads `iframe.html` from the repository host for the same `<version>`. That version must exist on Prismic, unless you run Prismic locally. Development builds also accept an editor on `localhost` in the embedded preview.

With a local Prismic behind a proxy, set `CDN_HOST` so lazy bundles load through it, and qualify the repository with the proxy domain:

```sh
CDN_HOST=http://wroom.test npm start
```

```html
<script src="//wroom.test/prismic-toolbar/<version>/prismic.js?repo=repo_name.wroom.test"></script>
```

## Check

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run bundlewatch
npx playwright install chromium
npm run test:browser
```

Browser tests serve fixtures on port 8082 and need no Prismic account. To inspect them by hand after `TOOLBAR_LOCAL_EDITOR=true npm run build`, run `node tests/fixtures/server.mjs` and open `http://localhost:8082/toolbar.html` or `http://localhost:8082/overlay.html`.

## Release

Every pull request from this repository is uploaded to `https://prismic.io/prismic-toolbar/pr-<number>/`. A bot comment gives the script to test it on any website.

Merging to `master` deploys to production when `package.json` has a new version: bump it in the pull request that should ship. CI uploads the versioned files, publishes `prismic.js` at the public URL, and invalidates the CDN. The **Rollback** workflow restores the public `prismic.js` of a previous version.
