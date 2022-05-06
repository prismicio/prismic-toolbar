let html2canvasPromise;

const screenshot = async () => {
	document
		.getElementById("prismic-toolbar-v2")
		.setAttribute("data-html2canvas-ignore", true);
	if (!html2canvasPromise)
		html2canvasPromise = script(
			"https://html2canvas.hertzen.com/dist/html2canvas.min.js",
		);
	await html2canvasPromise;
	try {
		const canvas = await window.html2canvas(document.body, {
			logging: false,
			width: "100%",
			height: window.innerHeight,
		});
		return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.6));
	} catch (e) {
		console.warn("Caught html2canvas error", e);
		// sometimes html2canvas errors.  This breaks creating a link.
		// While a preview image is nice it's not essential.
		// If html2canvas errors we create a dummy canvas and convert that to a blob.
		// The preview image is a black square
		// but at least we can share the image.
		const tempCanvas = document.createElement("canvas");
		return new Promise((resolve) =>
			tempCanvas.toBlob(resolve, "image/jpeg", 0.6),
		);
	}
};

function script(src) {
	return new Promise((resolve) => {
		const el = document.createElement("script");
		el.src = src;
		document.head.appendChild(el);
		el.addEventListener("load", () => resolve(el));
	});
}

export default screenshot;
