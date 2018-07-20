import { h, Component } from 'preact';
import { copyText, memoize } from 'common';
import { BasePanel, xSvg } from '.';
import { Icon } from '..';

let mShare; // Memoized share (load once for same URL)

export class SharePanel extends Component {
  constructor() {
    super(...arguments);
    this.state = { loading: true, url: '' };

    if (!mShare) mShare = memoize(this.props.preview.share, () => window.location.href);
    mShare().then(url => this.setState({ url, loading: false }));
  }

  render() {
    const { onClose, preview } = this.props;
    const { url, loading } = this.state;
    return (
      <BasePanel className="SharePanel">
        <Icon src={xSvg} onClick={onClose} />
        <ShareHeader title={preview.title} />
        <Share url={url} loading={loading} />
      </BasePanel>
    );
  }
}

const ShareHeader = ({ title }) => (
  <div className="ShareHeader">
    <div>{title}</div>
    <div>Get a shareable link</div>
  </div>
);

const Share = ({ url, loading }) => {
  if (loading) return 'loading share...';
  return (
    <div className="Share">
      <div>Share this preview via public share link</div>
      <div>{url}</div>
      <div onClick={() => copyText(url)}>Copy the link</div>
    </div>
  );
};
