# Prismic Toolbar

[![Github Actions CI][github-actions-ci-src]][github-actions-ci-href]
[![Conventional Commits][conventional-commits-src]][conventional-commits-href]
[![License][license-src]][license-href]

The official preview toolbar for [Prismic][prismic].

- Keeps your website in sync with [preview sessions][prismic-previews], live.
- Lets content writers copy a share link to a preview, and exit it.
- Powers the Page Builder's live previews: in-place updates, comments, and slice selection.
- Loads only a small script for visitors outside a preview session.

## Install

Add the script to every page of your website, including the 404 page. Replace `my-repository` with your repository name.

```html
<script
	async
	defer
	src="https://static.cdn.prismic.io/prismic.js?new=true&repo=my-repository"
></script>
```

Prismic's framework integrations add it for you, and `getToolbarSrc()` from `@prismicio/client` returns its URL.

Using an AI agent? Teach it how to set up Prismic previews by installing the Prismic skill:

```bash
npx skills add --global --yes prismicio/skills
```

## Documentation

For full documentation, visit the official Prismic documentation for your framework: [Next.js][prismic-docs-nextjs], [Nuxt][prismic-docs-nuxt], or [SvelteKit][prismic-docs-sveltekit].

To integrate the toolbar with another framework, listen to its preview events. The toolbar dispatches them on `window` and reloads the page unless one is cancelled.

| Event                  | `detail`  | When                                                                                |
| ---------------------- | --------- | ----------------------------------------------------------------------------------- |
| `prismicPreviewStart`  | `{ ref }` | A preview session starts on a page that does not show it yet, such as a share link. |
| `prismicPreviewUpdate` | `{ ref }` | The preview ref changed: new edits, a push from the editor, or another tab.         |
| `prismicPreviewEnd`    | `null`    | The preview ended.                                                                  |

```js
window.addEventListener("prismicPreviewUpdate", (event) => {
	event.preventDefault()
	refreshPageData()
})
```

## Contributing

Whether you're helping us fix bugs, improve the docs, or spread the word, we'd love to have you as part of the Prismic developer community!

**Asking a question**: [Open a new topic][forum-question] on our community forum explaining what you want to achieve / your question. Our support team will get back to you shortly.

**Reporting a bug**: [Open an issue][repo-issue] explaining your website's setup and the bug you're encountering.

**Suggesting an improvement**: [Open an issue][repo-issue] explaining your improvement or feature so we can discuss and learn more.

**Submitting code changes**: For small fixes, feel free to [open a pull request][repo-pull-requests] with a description of your changes. For large changes, please first [open an issue][repo-issue] so we can discuss if and how the changes should be implemented.

For more clarity on this project, check out the detailed [CONTRIBUTING.md][contributing] document.

## License

```
Copyright 2013-2026 Prismic <contact@prismic.io> (https://prismic.io)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

<!-- Links -->

[prismic]: https://prismic.io
[prismic-previews]: https://prismic.io/docs/previews
[prismic-docs-nextjs]: https://prismic.io/docs/nextjs#preview-draft-content
[prismic-docs-nuxt]: https://prismic.io/docs/nuxt#preview-draft-content
[prismic-docs-sveltekit]: https://prismic.io/docs/sveltekit#preview-draft-content
[contributing]: ./CONTRIBUTING.md
[forum-question]: https://community.prismic.io/c/kits-and-dev-languages/javascript/14
[repo-issue]: https://github.com/prismicio/prismic-toolbar/issues/new
[repo-pull-requests]: https://github.com/prismicio/prismic-toolbar/pulls

<!-- Badges -->

[github-actions-ci-src]: https://github.com/prismicio/prismic-toolbar/actions/workflows/ci.yml/badge.svg
[github-actions-ci-href]: https://github.com/prismicio/prismic-toolbar/actions/workflows/ci.yml
[conventional-commits-src]: https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg
[conventional-commits-href]: https://conventionalcommits.org
[license-src]: https://img.shields.io/github/license/prismicio/prismic-toolbar.svg
[license-href]: ./LICENSE
