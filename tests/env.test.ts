import { afterEach, describe, expect, it } from "vitest"

import {
	detectMode,
	findRepositoryHost,
	parseRepositoryHost,
	repositoryOrigin,
} from "../src/core/env"

afterEach(() => {
	document.head.innerHTML = ""
})

describe("detectMode", () => {
	const framed = (name: string) => ({ self: {}, top: {}, name }) as unknown as Window

	it("runs at the top level and in the editor's preview iframes only", () => {
		expect(detectMode(window)).toBe("regular")
		expect(detectMode(framed("prismic:embedded-preview"))).toBe("embedded-push")
		expect(detectMode(framed("prismic:embedded-preview:poll"))).toBe("embedded-poll")
		expect(detectMode(framed(""))).toBeUndefined()
		expect(detectMode(framed("some-other-frame"))).toBeUndefined()
	})
})

describe("parseRepositoryHost", () => {
	it.each([
		["example", "example.prismic.io"],
		["Example", "example.prismic.io"],
		["example.prismic.io", "example.prismic.io"],
		["example.cdn.prismic.io", "example.prismic.io"],
		["https://example.cdn.prismic.io/api/v2", "example.prismic.io"],
		["example.wroom.io", "example.wroom.io"],
		["repo_name.wroom.test", "repo_name.wroom.test"],
		["example.wroom.test:9000", "example.wroom.test:9000"],
		["first,second", "first.prismic.io"],
		[" example ", "example.prismic.io"],
	])("%s → %s", (input, expected) => {
		expect(parseRepositoryHost(input)).toBe(expected)
	})

	it.each([null, "", ",", "exa mple", "example.prismic.io<script>"])("rejects %s", (input) => {
		expect(parseRepositoryHost(input)).toBeUndefined()
	})
})

describe("findRepositoryHost", () => {
	it("reads the repo parameter of the last toolbar script when currentScript is unavailable", () => {
		document.head.innerHTML = `
			<script src="https://static.cdn.prismic.io/prismic.js?repo=first"></script>
			<script src="https://example.com/other.js"></script>
			<script src="https://static.cdn.prismic.io/prismic.min.js?new=true&repo=second"></script>
		`
		expect(findRepositoryHost()).toBe("second.prismic.io")

		document.head.innerHTML = `<script src="https://static.cdn.prismic.io/prismic.js"></script>`
		expect(findRepositoryHost()).toBeUndefined()
	})
})

describe("repositoryOrigin", () => {
	it("uses https, except for local .test repositories that follow the page", () => {
		const page = { protocol: "http:" } as Location
		expect(repositoryOrigin("example.prismic.io", page)).toBe("https://example.prismic.io")
		expect(repositoryOrigin("example.wroom.test", page)).toBe("http://example.wroom.test")
		expect(repositoryOrigin("example.wroom.test:9000", page)).toBe("http://example.wroom.test:9000")
	})
})
