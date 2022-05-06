export function getQueriesResults(tracker) {
	return fetch(`/toolbar/devMode?tracker=${tracker}`).then((r) => {
		if (r.status === 200) {
			return r.json();
		}

		return [];
	});
}
