import { h, Component } from 'preact';
import { BasePanel } from '.';

export class PreviewPanel extends Component {
  render() {
    return (
      <BasePanel onClose={this.props.onClose}>
        <Drafts documents={this.props.preview.documents} />
      </BasePanel>
    );
  }
}

const Drafts = ({ documents, loading }) => {
  return <div>{documents.map(doc => <Draft doc={doc} />)}</div>;
};

const Draft = ({ doc }) => (
  <div className="Draft">
    <div>{doc.title}</div>
    <div>{doc.summary}</div>
    <div>{doc.url}</div>
  </div>
);
