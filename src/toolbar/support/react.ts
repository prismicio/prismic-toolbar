import { useLayoutEffect, useMemo, useRef } from "preact/hooks"

// Better/Easier alternative to React's useCallback.
// Note that this only works if the callback is called as a DOM Event listener or in useEffect; don't use this if the callback can be synchronously called in render().
// 1) https://blog.thoughtspile.tech/2021/04/07/better-usecallback/
// 2) https://github.com/radix-ui/primitives/blob/main/packages/react/use-callback-ref/src/useCallbackRef.tsx
// 3) https://github.com/reactjs/rfcs/pull/220
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStableCallback<T extends (...args: any[]) => any>(callback: T | undefined): T {
	const callbackRef = useRef(callback)

	useLayoutEffect(() => {
		callbackRef.current = callback
	})

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument
	return useMemo(() => ((...args) => callbackRef.current?.(...args)) as T, [])
}
