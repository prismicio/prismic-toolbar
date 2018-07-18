import { h, Component } from 'preact';
import { BasePanel } from '.';

export class SharePanel extends Component {
  constructor() {
    super(...arguments);
    this.state = { loading: true, url: '' };
    this.props.preview.share().then(url => this.setState({ url, loading: false }));
  }

  render() {
    const { onClose } = this.props;
    return (
      <BasePanel onClose={onClose}>
        <Share {...this.state} />
      </BasePanel>
    );
  }
}

const Share = ({ url, loading }) => {
  if (loading) return 'loading share...';
  return `URL! ${url}`;
};
