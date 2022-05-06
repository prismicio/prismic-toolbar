# Prismic toolbar

The prismic toolbar enables content writers to:

- Identify Prismic content on the page
- Preview unpublished changes (drafts and releases)
- Perform A/B tests (experiments)

<!-- TODO add screenshots -->

## How to use it?

Include the following script on every page of your site (including the `404` page).

Remember to replace `YOUR_REPO_NAME` with the name of your Prismic repository.

```
<script src=//prismic.io/prismic.js?repo=YOUR_REPO_NAME></script>
```

## How to develop

- Start your toolbar locally:

```script
npm start
```

- Serve toolbar assets:

```script
npm run serve
```

It will serve assets at `http://localhost:8081/prismic-toolbar/[version]`. Where
version is current `package.json` version.

- Change the path of the script to point to `http://localhost:8081/prismic-toolbar/[version]/prismic.js` from your public folder

By default the toolbar will communicate with `prismic.io` so the local
`[version]` must match the version served by prismic.

### With a proxy

If you are using a proxy in front of the development server, you must set the
`CDN_HOST` environment variable, so the script will be loaded through the proxy.

Example:

```script
CDN_HOST=http://wroom.test npm start
```

Then from your project, load the prismic script like this:

```
<script src=//wroom.test/prismic-toolbar/[version]/prismic.js?repo=repo_name.wroom.test></script>
```

Note that the repo name should be qualified with your proxy domain for the
communication to work.

## How to deploy

- Deploy on prod:

```
npm run build:prod
```
