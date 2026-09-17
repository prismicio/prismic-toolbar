# Prismic toolbar

The Prismic toolbar enables content writers to:

- Identify Prismic content on the page
- Preview unpublished changes (drafts and releases)
- Perform A/B tests (experiments)

<!-- TODO add screenshots -->

## How to use it?

Include the following script on every page of your site (including the `404` page).

Replace `YOUR_REPO_NAME` with the name of your Prismic repository.

```html
<script src="//prismic.io/prismic.js?repo=YOUR_REPO_NAME"></script>
```

## How to develop

Use Node.js 24 or later (see `.nvmrc`):

```sh
nvm install
nvm use
npm ci
```

In two terminals:

```sh
npm start
npm run serve
```

Assets are served at `http://localhost:8081/prismic-toolbar/[version]`, where
`[version]` is the current `package.json` version. Point your site script at:

```html
<script src="http://localhost:8081/prismic-toolbar/[version]/prismic.js?repo=YOUR_REPO_NAME"></script>
```

`npm start` rebuilds the classic `prismic.js`, `overlay.js`, `toolbar.js`, and
`iframe.html` artifacts. Reload the customer page after a rebuild. Restart the
watcher after build config changes.

By default the toolbar talks to `prismic.io`, so the local `[version]` must match
the version Prismic serves.

### With a proxy

Set `CDN_HOST` so the lazy-loaded toolbar script goes through your proxy:

```sh
CDN_HOST=http://wroom.test npm start
```

```html
<script src="//wroom.test/prismic-toolbar/[version]/prismic.js?repo=repo_name.wroom.test"></script>
```

Qualify the repo name with your proxy domain so communication works.

## Tests

Unit tests: `npm test`.

Browser tests need Chromium once, then Playwright:

```sh
npx playwright install chromium
npm run test:browser
```

Fixtures are served on port 8082 (no Prismic account). For manual inspection after
a build:

```sh
node tests/fixtures/server.mjs
```

Then open `http://localhost:8082/toolbar.html` or `http://localhost:8082/overlay.html`.

## Checks

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run bundlewatch
npm run test:browser
```

## How to deploy

```sh
npm run build
```
