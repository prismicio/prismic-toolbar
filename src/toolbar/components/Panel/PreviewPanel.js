import { h, Component } from 'preact';
import { BasePanel, xSvg } from '.';
import { Icon } from '..';

export class PreviewPanel extends Component {
  render() {
    const { onClose, preview } = this.props;
    return (
      <BasePanel className="PreviewPanel">
        <Icon src={xSvg} onClick={onClose} />
        <PreviewHeader title={preview.title} numberOfDocs={preview.documents.length} />
        <PreviewDocuments documents={preview.documents} />
      </BasePanel>
    );
  }
}

const PreviewHeader = ({ title, numberOfDocs }) => (
  <div className="Header Top">
    <h2>{title}</h2>
    <h1>{numberOfDocs} documents to preview</h1>
  </div>
);

const PreviewDocuments = ({ documents }) => (
  <div className="Documents">
    {documents.map((doc, i) => <PreviewDocument doc={doc} key={i} />)}
  </div>
);

const PreviewDocument = ({ doc }) => (
  <div className="Draft">
    <h3>{doc.title}</h3>
    <div>{doc.summary}</div>
    <div>{doc.url}</div>
  </div>
);
