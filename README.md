# Prismic toolbar V2
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

- Create a symlink to the public folder of your project:
```script
ln -s <toolbar_path>/build/prismic.js <sample_project_path>/public
```

- Change the path of the script to point on `prismic.js` from your public folder

- On the writing room, define the path of your local toolbar:
```
local.toolbar="<relative_local_path>"
```

## How to deploy

- Deploy on prod:
```
npm run build:prod
```
