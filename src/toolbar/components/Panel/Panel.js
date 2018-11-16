import { switchy } from 'common';
import { views } from '..';
import { DocumentPanel, PreviewPanel, SharePanel } from '.';

const { NONE, DOCS, DRAFTS, SHARE } = views;

export const Panel = ({ closePanel, documents, preview, page }) =>
  switchy(page)({
    [DOCS]: <DocumentPanel documents={documents} onClose={closePanel} />,
    [DRAFTS]: <PreviewPanel preview={preview} onClose={closePanel} />,
    [SHARE]: <SharePanel preview={preview} onClose={closePanel} />,
    [NONE]: null,
  });
