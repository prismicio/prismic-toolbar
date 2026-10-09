# Contributing

This package is primarily maintained by [Prismic](https://prismic.io)[^1]. External contributions are welcome. Ask for help by [opening an issue](https://github.com/prismicio/prismic-toolbar/issues/new/choose), or request a review by opening a pull request.

## :gear: Setup

<!-- When applicable, list system requriements to work on the project. -->

The following setup is required to work on this project:

- Node.js 26
- npm CLI

## :memo: Project-specific notes

<!-- Share information about the repository. -->
<!-- What specific knowledge do contributors need? -->

#### Architecture

Each entry at the root of `src` builds one file to `dist/prismic-toolbar/<version>/`. A folder of the same name holds its code:

| Entry                     | Loaded                                                | Code                                               |
| ------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `src/prismic.ts`          | On every page, by the install snippet                 | `src/lib`                                          |
| `src/toolbar.ts`          | Only while a preview session is active                | `src/toolbar`: the preview bar                     |
| `src/embedded-preview.ts` | Only inside the Prismic editor's preview iframe       | `src/embedded-preview`: comment and slice overlays |
| `src/iframe.ts`           | Hidden, from the repository host, to read its cookies | `src/iframe`, inlined into `src/iframe.html`       |

- Each file is a self-contained classic script. The CDN sends no CORS headers, so `prismic.js` loads the other bundles as classic scripts, and they register on `window.__prismicToolbar`.
- `src/lib` holds the logic of `prismic.js` and code the bundles share. `preview-session.ts` keeps the website's preview cookie in sync with the repository's preview session and dispatches preview events. `embedded-push.ts` handles refs the editor pushes into its preview iframe.

#### Development builds

- `node --run dev` builds the toolbar on change, serves it at `http://localhost:8081/prismic-toolbar/<version>/`, and runs the [playground](./playground/README.md) with it at `http://localhost:3000`.
- Development builds also accept an editor on `localhost` in the embedded preview. Set `TOOLBAR_LOCAL_EDITOR=true` to allow it in a production build.
- Websites load `iframe.html` from the repository host, from the same folder as `prismic.js`. Local builds use the `package.json` version, which has no folder on Prismic: set `TOOLBAR_VERSION` to a deployed commit or pull request preview, like `pr-149`, to reuse its iframe.
- With a local Prismic behind a proxy, set `CDN_HOST` so bundles load through it, and qualify the repository with the proxy domain:

  ```sh
  CDN_HOST=http://wroom.test node --run dev
  ```

  ```html
  <script src="//wroom.test/prismic-toolbar/<version>/prismic.js?repo=repo_name.wroom.test"></script>
  ```

#### Cookies

- The toolbar stores the preview ref in the `io.prismic.preview` cookie, which `@prismicio/client` sends to the Content API.
- On a website, the cookie holds JSON: `{ "_tracker": "…", "<repository host>": { "preview": "<ref>" } }`. The tracker comes first: older SDKs read the cookie with a regular expression. Inside the editor, it holds the raw ref.
- The `io.prismic.preview.updated` cookie marks refs the editor pushed, so website tabs leave them alone.

#### Tests

- Tests are grouped like `src`: one folder per entry, plus `tests/lib`.
- Unit tests use [Vitest](https://vitest.dev/) and are named after the file they test, like `tests/lib/preview-session.test.ts`.
- E2E tests use [Playwright](https://playwright.dev/) and are named after the feature they test, like `tests/prismic/previews.spec.ts`. They run the production build at its production URLs against a fake website, repository, and editor, defined in `tests/infra`. They need no Prismic account.

## :construction_worker: Develop

> [!NOTE]
> It's highly recommended to discuss your changes with the Prismic team before starting by [opening an issue](https://github.com/prismicio/prismic-toolbar/issues/new/choose).[^2]
>
> A short discussion can accellerate your work and ship it faster.

```sh
# Clone and prepare the project.
git clone git@github.com:prismicio/prismic-toolbar.git
cd prismic-toolbar
npm install

# Create a new branch for your changes (e.g. lh/fix-win32-paths).
git checkout -b <your-initials>/<feature-or-fix-description>

# Start the development watcher and the playground.
# Run this command while you are working on your changes.
node --run dev

# Build the project for production.
# Run this command when you want to see the production version.
node --run build

# Lint your changes before requesting a review. No errors are allowed.
node --run lint
# Some errors can be fixed automatically:
node --run lint -- --fix

# Format your changes before requesting a review. No errors are allowed.
node --run format

# Install the browser used by E2E tests.
npx playwright install chromium

# Test your changes before requesting a review.
# All changes should be tested. No failing tests are allowed.
node --run test
# Run only unit tests (optionally in watch mode):
node --run unit
node --run unit:watch
# Run only E2E tests (optionally in UI mode):
node --run e2e
node --run e2e:ui
# Run only type tests
node --run types
```

## :building_construction: Submit a pull request

> [!NOTE]
> Code will be reviewed by the Prismic team before merging.[^3]
>
> Request a review by opening a pull request.

```sh
# Open a pull request. This example uses the GitHub CLI.
gh pr create

# Someone from the Prismic team will review your work. This review will at
# least consider the PR's general direction, code style, and test coverage.

# Pull requests from this repository are uploaded to
# https://prismic.io/prismic-toolbar/pr-<number>/. A bot comment gives the
# script to test it on any website.

# When ready, PRs should be merged using the "Squash and merge" option.
```

## :rocket: Publish

> [!CAUTION]
> Publishing is restricted to the Prismic team.[^4]

Merging to `master` deploys to production when it changes the toolbar. CI uploads the build to `prismic.io/prismic-toolbar/<commit>/`, named after the commit's first 8 characters, publishes its `prismic.js` at the public URL, and invalidates the CDN.

To roll back, run the [Rollback workflow](https://github.com/prismicio/prismic-toolbar/actions/workflows/rollback.yml) with a previously deployed commit.

[^1]: This package is maintained by the DevX team. Prismic employees can ask for help or a review in the [#team-devx](https://prismic-team.slack.com/archives/C014VAACCQL) Slack channel.

[^2]: Prismic employees are highly encouraged to discuss changes with the DevX team in the [#team-devx](https://prismic-team.slack.com/archives/C014VAACCQL) Slack channel before starting.

[^3]: Code should be reviewed by the DevX team before merging. Prismic employees can request a review in the [#team-devx](https://prismic-team.slack.com/archives/CPG31MDL1) Slack channel.

[^4]: Prismic employees can ask the DevX team for access to deploy workflows.
