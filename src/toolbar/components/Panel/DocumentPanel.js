import { h, Component } from 'preact';
import { BasePanel } from '.';

export class DocumentPanel extends Component {
  constructor() {
    super(...arguments);
    this.state = { loading: true, documents: [] };
    this.props.prediction.documents.then(documents =>
      this.setState({ documents, loading: false })
    );
  }

  render() {
    const { onClose } = this.props;
    return (
      <BasePanel onClose={onClose}>
        <Documents {...this.state} />
      </BasePanel>
    );
  }
}

const Documents = ({ documents, loading }) => {
  if (loading) return 'loading docs...';
  return <div>{documents.map(doc => <Document doc={doc} />)}</div>;
};

const Document = ({ doc }) => (
  <div className="Document">
    <div>{doc.id}</div>
  </div>
);
