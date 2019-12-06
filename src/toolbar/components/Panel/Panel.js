import { TransitionGroup } from 'react-transition-group';
import { switchy } from '@common';
import { views, Animation } from '..';
import { DocumentPanel, PreviewPanel, SharePanel } from '.';

const { DOCS, DRAFTS, SHARE } = views;

export const Panel = ({
  closePanel,
  documents,
  queries,
  documentsLoading,
  previews,
  page
}) => (
  <TransitionGroup>{
    !page || (
      <Animation.SlideIn key={1}>{
        switchy(page)({
          [DOCS]: <DocumentPanel
            documents={documents}
            loading={documentsLoading}
            onClose={closePanel}
            queries={queries} />,
          [DRAFTS]: <PreviewPanel
            maxSummarySize={150}
            maxTitleSize={35}
            previews={previews}
            onClose={closePanel}
          />,
          [SHARE]: <SharePanel previews={previews} onClose={closePanel} />,
        })
      }</Animation.SlideIn>
    )
  }</TransitionGroup>
);
