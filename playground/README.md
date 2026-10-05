# Toolbar playground

A minimal Next.js website to try the toolbar with a real repository, locally and on Vercel. It uses `@prismicio/next` and `@prismicio/react` like a customer website, renders any repository's documents and slices, and loads the toolbar under test.

## Repository

The playground shows `prismic-main` by default; set `NEXT_PUBLIC_DEFAULT_REPOSITORY` to change it. Pick another repository in the header: a name, like `prismic-main`, or a host outside `prismic.io`, like `example.wroom.io`. The choice is remembered in a cookie. Previews started from Prismic switch to their repository automatically.

To preview from Prismic, add the playground to the repository's previews, with `/api/preview` as the preview route.

## Toolbar

| Where                        | Toolbar                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| `npm run dev` at the root    | Your local build, rebuilt on change                                       |
| Vercel pull request preview  | That pull request's build, from `prismic.io/prismic-toolbar/pr-<number>/` |
| Vercel production (`master`) | The released toolbar                                                      |

`TOOLBAR_SRC` overrides it. The header shows the script in use.

Locally, the toolbar's hidden iframe still loads from the repository host, for the same version. It only exists there once that version is released or uploaded as a pull request preview, so a local build with a new version cannot reach the preview session. Run `TOOLBAR_VERSION=pr-<number> npm run dev` to reuse a pull request's iframe. The editor's live preview does not need the iframe and works with any local build.

`<PrismicPreview>` from `@prismicio/next` always loads the released toolbar, so `src/app/Preview.tsx` mirrors it with a configurable script.

## Vercel

Create a Vercel project from this repository with `playground` as its root directory. Vercel deploys `master` to production and every branch as a preview.
