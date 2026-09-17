interface PrismicToolbarAPI {
	endpoint: string | null
	version: string
	setup(...repositories: string[]): void
	startExperiment(experimentId: string): void
	setupEditButton(): void
	Toolbar?: new (options: {
		displayPreview: boolean
		auth: unknown
		preview: unknown
		prediction: unknown
		analytics: unknown
	}) => object
}

interface Window {
	prismic?: PrismicToolbarAPI
	PrismicToolbar?: PrismicToolbarAPI
}

declare const CDN_HOST: string
