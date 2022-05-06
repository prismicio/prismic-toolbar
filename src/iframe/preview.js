import {
	fetchy,
	query,
	getCookie,
	demolishCookie,
	throttle,
	memoize,
} from "@common";

const SESSION_ID = getCookie("io.prismic.previewSession");

// Close preview session
function closePreviewSession() /* void */ {
	demolishCookie("io.prismic.previewSession", {
		sameSite: "None",
		secure: true,
	});
}

const PreviewRef = {
	getCurrent: throttle(async () => {
		const s = await State.get();
		const ref = encodeURIComponent(s.preview.ref);
		const current = await fetchy({
			url: `/previews/${SESSION_ID}/ping?ref=${ref}`,
		});

		if (typeof s.preview === "object") {
			s.preview.ref = current.ref;
			State.set(s);
		}

		return current;
	}, 2000),
};

const Share = {
	run: memoize(
		async (location, blob) => {
			const imageId =
				location.pathname.slice(1) + location.hash + SESSION_ID + ".jpg";
			const imageName = imageId;
			const session = await Share.getSession({ location, imageName });
			if (!session.hasPreviewImage) Share.uploadScreenshot(imageName, blob);
			return session.url;
		},
		({ href }) => href,
	),

	async getSession({ location, imageName }) {
		const s = await State.get();
		const qs = query({
			sessionId: SESSION_ID,
			pageURL: location.href,
			title: s.preview.title,
			imageName,
			_: s.csrf,
		});

		return fetchy({
			url: `/previews/s?${qs}`,
			method: "POST",
		});
	},

	async uploadScreenshot(imageName, blob) {
		const acl = await fetchy({
			url: `/previews/${SESSION_ID}/acl`,
		});

		// Form
		const body = new FormData();
		body.append("key", `${acl.directory}/${imageName}`);
		body.append("AWSAccessKeyId", acl.key);
		body.append("acl", "public-read");
		body.append("policy", acl.policy);
		body.append("signature", acl.signature);
		body.append("Content-Type", "image/png");
		body.append("Cache-Control", "max-age=315360000");
		body.append("Content-Disposition", `inline; filename=${imageName}`);
		body.append("file", blob);

		// Upload
		return fetch(acl.url, { method: "POST", body });
	},
};

const State = {
	liveStateNeeded:
		Boolean(getCookie("is-logged-in")) ||
		Boolean(getCookie("io.prismic.previewSession")),

	state: null,

	get: async () => {
		if (!State.state) {
			await State.insert();
		}
		return State.state;
	},

	set: (newState = {}) => {
		State.state = newState;
	},

	setNormalized: (newState = {}) => {
		State.set(State.normalize(newState));
	},

	insert: async () => {
		if (!State.liveStateNeeded) {
			State.setNormalized();
		} else {
			State.setNormalized(await fetchy({ url: "/toolbar/state" }));
		}
	},

	normalize: (_state = {}) =>
		Object.assign(
			{},
			{
				csrf: _state.csrf || null,
				auth: Boolean(_state.isAuthenticated),
				preview: _state.previewState || null,
			},
			_state.previewState
				? {
						preview: {
							ref: _state.previewState.ref,
							title: _state.previewState.title,
							updated: _state.previewState.lastUpdate,
							documents: []
								.concat(_state.previewState.draftPreview)
								.concat(_state.previewState.releasePreview)
								.filter(Boolean),
						},
				  }
				: {},
		),
};

export default {
	getState: State.get,
	share: Share.run,
	close: closePreviewSession,
	getCurrentRef: PreviewRef.getCurrent,
};
