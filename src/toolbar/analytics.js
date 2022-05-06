export class Analytics {
	constructor(client) {
		this.client = client;
	}

	// Track edit button document clicks
	trackDocumentClick = (arg) => this.client.trackDocumentClick(arg);

	// Track initial setup of toolbar
	trackToolbarSetup = () => this.client.trackToolbarSetup();
}
