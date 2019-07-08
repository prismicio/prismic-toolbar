import { BasePanel, xSvg } from '.';
import { Icon } from '..';
import { stringCheck } from '@common';

export const PreviewPanel = ({ maxSummarySize, maxTitleSize, onClose, preview }) => (
  <BasePanel className="PreviewPanel">
    <Icon className="x" src={xSvg} onClick={onClose} />
    <PreviewHeader
      title={stringCheck(preview.title, maxTitleSize)}
      numberOfDocs={preview.documents.length}
    />
    <PreviewDocuments
      documents={preview.documents}
      maxTitleSize={maxTitleSize}
      maxSummarySize={maxSummarySize}
    />
  </BasePanel>
);

const PreviewHeader = ({ title, numberOfDocs }) => (
  <div className="Header top">
    <h2>{title}</h2>
    <h1>{numberOfDocs} document{numberOfDocs === 1 ? '' : 's'} to preview</h1>
  </div>
);

const PreviewDocuments = ({ documents, maxSummarySize, maxTitleSize }) => (
  <div className="Documents bottom">
    {documents.map(doc =>
      <PreviewDocument
        doc={doc}
        maxSummarySize={maxSummarySize}
        maxTitleSize={maxTitleSize}
      />
    )}
  </div>
);

const PreviewDocument = ({ doc, maxSummarySize, maxTitleSize }) => (
  <a className="Draft" href={doc.url} target="_blank">
    <h3>{stringCheck(doc.title, maxTitleSize)}</h3>
    <div>{stringCheck(doc.summary, maxSummarySize)}</div>
  </a>
);
