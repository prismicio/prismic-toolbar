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
npm run serve-assets
```

It will serve assets at `http://localhost:8081`.

- Change the path of the script to point on `http://localhost:8081/prismic.js` from your public folder

## How to deploy

- Deploy on prod:
```
npm run build:prod
```
