import { h } from 'preact';
import { switchy } from 'common';
import { views } from '..';
import { DocumentPanel, PreviewPanel, SharePanel } from '.';
import './Panel.css';

const { NONE, DOCS, DRAFTS, SHARE } = views;

export const Panel = ({ closePanel, prediction, preview, page }) =>
  switchy(page)({
    [DOCS]: <DocumentPanel prediction={prediction} onClose={closePanel} />,
    [DRAFTS]: <PreviewPanel preview={preview} onClose={closePanel} />,
    [SHARE]: <SharePanel preview={preview} onClose={closePanel} />,
    [NONE]: null,
  });
