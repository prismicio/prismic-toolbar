import { Component } from "preact";
import { copyText, wait } from "@common";
import { BasePanel, xSvg } from ".";
import { Icon } from "..";

export class SharePanel extends Component {
	constructor() {
		super(...arguments);
		this.state = { loading: true, url: "" };
		this.props.preview
			.share()
			.then((url) => this.setState({ url, loading: false }));
	}

	render() {
		const { onClose, preview } = this.props;
		const { url, loading } = this.state;

		return (
			<BasePanel className="SharePanel">
				<Icon className="x" src={xSvg} onClick={onClose} />
				<ShareHeader title={preview.title} />
				<Share url={url} loading={loading} />
			</BasePanel>
		);
	}
}

const ShareHeader = ({ title }) => (
	<div className="ShareHeader top">
		<h2>{title}</h2>
		<h1>Get a shareable link</h1>
	</div>
);

class Share extends Component {
	state = { copied: false };

	async copy() {
		copyText(this.props.url);
		this.setState({ copied: true });
		await wait(1);
		this.setState({ copied: false });
	}

	render() {
		const { url, loading } = this.props;
		const { copied } = this.state;

		return (
			<div className="Share bottom">
				<h2>Share this preview via public share link</h2>
				<div className="url">{loading ? "Loading..." : url}</div>
				{url && (
					<div className="copy" onClick={() => this.copy()}>
						{copied ? "Copied!" : "Copy the link"}
					</div>
				)}
			</div>
		);
	}
}
