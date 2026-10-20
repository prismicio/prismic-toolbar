# Toolbar playground

A minimal Next.js website to try the toolbar with a real repository, locally and on Vercel. It uses `@prismicio/next` and `@prismicio/react` like a customer website, renders any repository's documents and slices, and loads the toolbar under test.

## Repository

The playground shows `prismic-main` by default; set `NEXT_PUBLIC_DEFAULT_REPOSITORY` to change it. Pick another repository in the header: a name, like `prismic-main`, or a host outside `prismic.io`, like `example.wroom.io`. The choice is remembered in a cookie. Previews started from Prismic switch to their repository automatically.

To preview from Prismic, add the playground to the repository's previews, with `/api/preview` as the preview route. Add `/legacy/api/preview` as another preview to try the legacy flow.

## Flows

| Where     | Flow                                   | SDK                                                                                           |
| --------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| `/`       | Modern: the toolbar loads with `&v=5`  | `@prismicio/next` from [prismic-next#175](https://github.com/prismicio/prismic-next/pull/175) |
| `/legacy` | Legacy: the toolbar follows its iframe | `@prismicio/next-legacy`, an alias of `@prismicio/next@2.3.3`                                 |

Each flow has its own preview and exit routes under its path. The header switches between them.

In the modern flow, the preview route stores the URL's `session` parameter in the `io.prismic.previewSession` cookie, and the toolbar follows that session with Prismic's public ping. The Prismic editor does not add `session` to preview URLs yet, so editor previews fall back to the legacy flow. To try the modern flow, open a preview from the editor once, copy the `io.prismic.previewSession` cookie of `<repository>.prismic.io` from the browser's developer tools, and open the preview URL again with `&session=<that value>` added.

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
