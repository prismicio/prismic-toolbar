// Throttle (https://codeburst.io/throttling-and-debouncing-in-javascript-b01cad5c8edf)
export const throttle = <This, Args extends unknown[], Result>(
	func: (this: This, ...args: Args) => Result,
	timeout: number,
) => {
	let queue: ReturnType<typeof setTimeout> | undefined
	let lastReturn: Result | undefined
	let lastRan = -Infinity
	return function (this: This, ...args: Args) {
		const since = Date.now() - lastRan
		const due = since >= timeout
		const run = () => {
			lastRan = Date.now()
			lastReturn = func.apply(this, args)
		}
		clearTimeout(queue)
		if (due) run()
		else queue = setTimeout(run, timeout - since)
		return lastReturn
	}
}

// Once
export const once = <Args extends unknown[], Result>(func: (...args: Args) => Result) => {
	let result: Result
	let done = false
	return function (...args: Args) {
		if (!done) {
			result = func(...args)
			done = true
		}
		return result
	}
}
