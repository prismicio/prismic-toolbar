# Prismic Toolbar

The Prismic Toolbar lets content writers preview unpublished changes on their website:

- It keeps the website's preview cookie in sync with the Prismic preview session, live.
- It shows a small bar to copy a share link to the preview and to exit it.
- Inside the Prismic editor, it powers the live preview: in-place updates, comments, and slice selection.

Visitors without a preview session only download a small loader. The rest loads on demand.

## Install

Add this script to every page of your website, including the 404 page. Replace `YOUR_REPOSITORY` with your repository name, or its host for repositories outside `prismic.io`.

```html
<script
	async
	defer
	src="https://static.cdn.prismic.io/prismic.js?new=true&repo=YOUR_REPOSITORY"
></script>
```

`@prismicio/client`'s `getToolbarSrc()` returns this URL, and the framework SDKs (`@prismicio/next`, `@nuxtjs/prismic`, …) add the script for you.

## Preview events

The toolbar dispatches these cancelable events on `window`. When nothing cancels them, it reloads the page. Frameworks cancel them to refresh the page without a full reload.

| Event                  | `detail`  | When                                                                                |
| ---------------------- | --------- | ----------------------------------------------------------------------------------- |
| `prismicPreviewStart`  | `{ ref }` | A preview session starts on a page that does not show it yet, such as a share link. |
| `prismicPreviewUpdate` | `{ ref }` | The preview ref changed: new edits, a push from the editor, or another tab.         |
| `prismicPreviewEnd`    | `null`    | The preview ended. The toolbar already removed its ref from the cookie.             |

```js
window.addEventListener("prismicPreviewUpdate", (event) => {
	event.preventDefault()
	refreshPageData()
})
```

## Cookies

The toolbar stores the preview ref in the `io.prismic.preview` cookie, which `@prismicio/client` sends to the Content API as is. On a website, the cookie holds JSON: `{ "<repository host>": { "preview": "<ref>" } }`. Inside the editor, it holds the raw ref. The `io.prismic.preview.updated` cookie marks refs pushed by the editor, so other tabs leave them alone.

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Apache-2.0
