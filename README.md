# Prismic toolbar
The prismic toolbar enables content writers to:
 - Preview unpublished changes (drafts and releases)
 - Perform A/B tests (experiments)
 - Directly link to documents in Writing Room

<!-- TODO add screenshots -->

## How to use it?
Include the following script on every page of your site (including the `404` page).

Remember to replace `<your-repo-name>` with the name of your Prismic repository.

```
<script>
  window.prismic = {
    endpoint: 'https://<your-repo-name>.prismic.io/api/v2'
  };
</script>
<script src=//static.cdn.prismic.io/prismic.min.js></script>
```
