import { createClient, ForbiddenError } from '@prismicio/client';

const PRISMIC_MAIN_DOCUMENT = 'prismic-main-document';
const PRISMIC_DOCUMENTS = 'prismic-documents';

// Get main and sub documents IDs from meta
export const getDocumentIDsFromMeta = (silent = false) => {
  // Get `prismic-main-document` meta tags
  const $main = document.querySelectorAll(
    `meta[name="${PRISMIC_MAIN_DOCUMENT}"]`
  );
  // Get `prismic-documents` meta tags
  const $subs = document.querySelectorAll(`meta[name="${PRISMIC_DOCUMENTS}"]`);

  // If page uses meta tags
  if ($main.length || $subs.length) {
    if (!silent) {
      // Warn about wrong `prismic-main-document` usage
      if ($main.length === 0) {
        console.warn(
          '[prismic-toolbar] No main document found, for better results, please declare your main document using the `prismic-main-document` meta tag.'
        );
      } else if ($main.length > 1) {
        console.warn(
          '[prismic-toolbar] Multiple `prismic-main-document` meta tags found, only the first one will be used.'
        );
      }
    }

    // Get main document
    const main = $main[0] ? $main[0].content : null;

    // Get sub documents
    const subs = [...$subs]
      .map(sub => sub.content.split(',').map(id => id.trim()))
      .flat()
      .filter((id, index, arr) =>
        id && arr.indexOf(id) === index && id !== main
      ) // Filters duplicates and main
      .slice(0, main ? 19 : 20); // Limit to a total of 20

    // Return if we have at least one document
    if (main || subs.length) {
      return { main, subs };
    }
  }

  return null;
};

export const watchHead = callback => {
  const $head = document.querySelector('head');
  if ($head) {
    const observer = new MutationObserver(async mutationsList => {
      for (let i = 0; i < mutationsList.length; i++) {
        const nodes = [
          mutationsList[i].target,
          ...mutationsList[i].addedNodes,
          ...mutationsList[i].removedNodes
        ];

        // If some nodes are Prismic meta tags...
        if (nodes.some(node => [PRISMIC_MAIN_DOCUMENT, PRISMIC_DOCUMENTS].includes(node.name))) {
          // ...run callback (update precdiction)
          await callback();

          break;
        }
      }
    });

    observer.observe($head, { attributes: true, childList: true, attributeFilter: ['name', 'content'], subtree: true });
  }
};

export const forceDocumentTracking = async docIDs => {
  // Create client
  const client = createClient(`${this.apiEndPoint}/api/v2`);

  // Query main and sub documents
  try {
    await client.getByIDs([docIDs.main, ...docIDs.subs].filter(Boolean));
  } catch (error) {
    if (error instanceof ForbiddenError) {
      console.warn("[prismic-toolbar] Meta tags-based prediction doesn't work yet with private repositories.");
    } else {
      // Fail silently but log error for debugging ease
      console.error(error);
    }
  }
};

export const tamperDocumentsAndQueries = (docIDs, documentsSorted, queriesResults) => {
  // Sort main document first when available
  if (docIDs.main) {
    documentsSorted = documentsSorted.sort((a, _b) => a.id === docIDs.main ? -1 : 1);
  }

  // All ids queried
  const ids = [docIDs.main, ...docIDs.subs].filter(Boolean);
  // Find the query made above in query results
  const allIDsQueryIndex = queriesResults.findIndex(query =>
    query.length === ids.length
    && query.every(doc => ids.includes(doc.id))
  );

  // If we found the query
  if (allIDsQueryIndex !== -1) {
    // Group results by type
    queriesResults = Object.values(
      queriesResults
        // queriesResults is a nested array of documents
        .flat()
        // Filter unique documents
        .filter((doc1, index, arr) => arr.findIndex(doc2 => doc2.id === doc1.id) === index)
        // Group by type
        .reduce((acc, doc) => {
          (acc[doc.type] ||= []).push(doc);

          return acc;
        }, {})
    );

    if (docIDs.main) {
      queriesResults = queriesResults
        // Sort main document type group at top
        .sort((a, _b) => a.some(doc => doc.id === docIDs.main) ? -1 : 1)
        // Sort main document at top of first group
        .map((docs, index) => {
          if (index === 0) {
            return docs.sort((a, _b) => a.id === docIDs.main ? -1 : 1);
          }

          return docs;
        });
    }
  }

  return [documentsSorted, queriesResults];
};
