import { localStorage, getCookie } from "@common";

export async function trackDocumentClick(isMain) {
	await fetch(`/toolbar/trackDocumentClick?isMain=${Boolean(isMain)}`);

	return null;
}

export async function trackToolbarSetup() {
	const didTrack = localStorage("toolbarSetupTracked");
	if (!getCookie("is-logged-in") || didTrack.get()) {
		return;
	}
	await fetch("/toolbar/trackToolbarSetup");
	didTrack.set(true);

	return null;
}
