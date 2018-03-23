[![Dependency Status](https://david-dm.org/prismicio/prismic-toolbar.svg)](https://david-dm.org/prismicio/prismic-toolbar)

# Prismic toolbar
The prismic toolbar is integrated to your website for:
 - Preview unpublished changes (drafts and releases)
 - Edit button: easy access to the corresponding document in the Prismic Backend.
 - A/B testing (experiments)

## How to use it?
In order to use the toolbar you need to include the following script on every page of your site. You need to make sure to replace `<your-repo-name>` with the url name of your Prismic repository.

```
<script>
  window.prismic = {
    endpoint: 'https://<your-repo-name>.prismic.io/api/v2'
  };
</script>
<script type="text/javascript" src="//static.cdn.prismic.io/prismic.min.js"></script>
```

## Prismic Documentation
More info for how to setup Previews & Edit buttons can be found in the [Prismic.io documentation](https://prismic.io/docs/javascript/beyond-the-api/in-website-preview). There are resources there for all the main technologies we support.