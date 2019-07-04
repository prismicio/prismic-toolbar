import { fetchy } from '@common';

export function getQueriesResults(tracker) {
  return fetchy({
    url: `/toolbar/devMode?tracker=${tracker}`,
    method: 'GET'
  });
}
