import { Icon, views, ScrollingName, Animation } from "..";
import { xSvg, linkSvg } from ".";

const { DRAFTS, SHARE } = views;

export const PreviewMenu = ({
	setPage,
	auth,
	preview,
	in: inProp,
	closePreview,
}) => {
	const len = preview.documents.length;

	const close = () => {
		// unmount preview component
		closePreview();
		// kill the preview session
		preview.end();
	};

	return (
		<Animation.SlideIn in={inProp}>
			<div className="PreviewMenu">
				<div className="top">
					<ScrollingName className="preview-title">
						{preview.title}
					</ScrollingName>
					{Boolean(len) && (
						<div className="docs" onClick={() => setPage(DRAFTS)}>
							({len} doc{len !== 1 ? "s" : ""})
						</div>
					)}
				</div>

				{auth ? (
					<div className="share" onClick={() => setPage(SHARE)}>
						<span>Get a shareable link</span>
						<Icon className="link" src={linkSvg} />
					</div>
				) : (
					<a
						className="powered-prismic"
						target="_blank"
						href="http://prismic.io/pages/powered-by-prismic"
					>
						Powered by Prismic
					</a>
				)}

				<Icon className="x" src={xSvg} onClick={close} />
			</div>
		</Animation.SlideIn>
	);
};
