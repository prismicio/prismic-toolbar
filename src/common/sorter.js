// import Fuse from 'fuse.js'; // uncomment to use fuzzy find
/* global Fuse */

const transpose = (matrix) =>
	matrix[0].map((col, i) => matrix.map((row) => row[i]));

// Sorter: Filters executed in order and winner comes first
export class Sorter {
	constructor(data) {
		this.data = data;
		this.filters = [];
	}

	addFilter(computeValues, compare) {
		this.filters.push({ computeValues, compare });

		return this;
	}

	compareData() {
		const computedValues = this.filters.map((f) => f.computeValues(this.data));

		return transpose(computedValues).map((nodes, index) => ({ nodes, index }));
	}

	compareFunction() {
		const comparers = this.filters.map((f) => f.compare);

		return function (a, b) {
			let result = 0;
			for (let i = 0; i < comparers.length; i += 1) {
				const { didFirstWin, tie } = comparers[i](a.nodes[i], b.nodes[i]);
				if (!tie) {
					result = didFirstWin ? -1 : 1;
				}
			}

			return result;
		};
	}

	is(val) {
		return this.addFilter(
			(data) => data.map((x) => Boolean(val(x))),
			(a, b) => ({
				didFirstWin: a,
				tie: a === b,
			}),
		);
	}

	isNot(val) {
		return this.addFilter(
			(data) => data.map((x) => Boolean(val(x))),
			(a, b) => ({
				didFirstWin: !a,
				tie: a === b,
			}),
		);
	}

	min(val) {
		return this.addFilter(
			(data) => data.map((x) => val(x)),
			(a, b) => ({
				didFirstWin: a < b,
				tie: a === b,
			}),
		);
	}

	max(val) {
		return this.addFilter(
			(data) => data.map((x) => val(x)),
			(a, b) => ({
				didFirstWin: a > b,
				tie: a === b,
			}),
		);
	}

	missing(val, regex) {
		return this.addFilter(
			(data) => data.map((x) => Boolean(val(x).match(regex))),
			(a, b) => ({
				didFirstWin: a,
				tie: a === b,
			}),
		);
	}

	in(val, str) {
		return this.addFilter(
			(data) => data.map((x) => Boolean(str.match(val(x)))),
			(a, b) => ({
				didFirstWin: a,
				tie: a === b,
			}),
		);
	}

	// val: x => 'food', query: 'foo', options: { caseSensitive, threshold, location, distance }
	fuzzy(val, text, options) {
		return this.addFilter(
			(data) => {
				const values = data.map((x) => val(x));

				const defaults = {
					caseSensitive: false,
					maxPatternLength: 300,
					minMatchCharLength: 4,
				};

				const overrides = {
					id: undefined,
					keys: undefined,
					shouldSort: false,
					tokenize: true,
					matchAllTokens: true,
					includeScore: true,
					findAllMatches: true,
					includeMatches: false,
				};

				const fuse = new Fuse(
					[text],
					Object.assign(defaults, options, overrides),
				);

				// Return search results
				return values
					.map(
						(value) =>
							fuse.search(value.slice(0, 300).trim())[0] || { score: 1 },
					)
					.map((x) => x.score);
			},
			(a, b) => ({
				didFirstWin: a < b,
				tie: a === b,
			}),
		);
	}

	compute() {
		const result = stableSort(this.compareData(), this.compareFunction());

		return result.map((r) => this.data[r.index]);
	}
}

const stableSort = (arr, compare) =>
	arr
		.map((item, index) => ({ item, index }))
		.sort((a, b) => compare(a.item, b.item) || a.index - b.index)
		.map(({ item }) => item);
