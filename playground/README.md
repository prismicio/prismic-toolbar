# Toolbar playground

A minimal Next.js website to try the toolbar with a real repository, locally and on Vercel. It uses `@prismicio/next` and `@prismicio/react` like a customer website, renders any repository's documents and slices, and loads the toolbar under test.

## Repository

The playground shows `prismic-main` by default; set `NEXT_PUBLIC_DEFAULT_REPOSITORY` to change it. Pick another repository in the header: a name, like `prismic-main`, or a host outside `prismic.io`, like `example.wroom.io`. The choice is remembered in a cookie. Previews started from Prismic switch to their repository automatically.

To preview from Prismic, add the playground to the repository's previews, with `/api/preview` as the preview route. Add `/v4/api/preview` as another preview to try the v4 flow.

## Flows

| Where     | Flow                                   | SDK                                                                                           |
| --------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| `/`       | v5: the toolbar loads with `&v=5`      | `@prismicio/next` from [prismic-next#175](https://github.com/prismicio/prismic-next/pull/175) |
| `/v4`     | v4: the toolbar follows its iframe     | `@prismicio/next-v4`, an alias of `@prismicio/next@2.3.3`                                     |

Each flow has its own preview and exit routes under its path. The header switches between them.

In the v5 flow, the editor adds `session` to preview URLs, the preview route stores it in the `io.prismic.previewSession` cookie, and the toolbar follows that session with Prismic's public ping.

## Toolbar

| Where                        | Toolbar                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| `npm run dev` at the root    | Your local build, rebuilt on change                                       |
| Vercel pull request preview  | That pull request's build, from `prismic.io/prismic-toolbar/pr-<number>/` |
| Vercel production (`master`) | The released toolbar                                                      |

`TOOLBAR_SRC` overrides it. The header shows the script in use.

Locally, the toolbar's hidden iframe still loads from the repository host, from the folder of the build. Local builds are never deployed, so `npm run dev` names its build after the last commit deployed from `origin/master` and reuses that iframe. Run `TOOLBAR_VERSION=pr-<number> npm run dev` to reuse a pull request's iframe instead, to test changes to it. The editor's live preview does not need the iframe and works with any local build.

`<PrismicPreview>` always loads the released toolbar, so `src/app/Preview.tsx` mirrors it for each flow, with a configurable script.

## Vercel

The `prismic-toolbar-playground` project on the Prismic team serves https://prismic-toolbar-playground.vercel.app. It deploys this repository's `playground` folder: `master` to production and every branch as a preview.
