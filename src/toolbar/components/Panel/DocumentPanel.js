import { BasePanel, prismicWhiteSvg } from '.';
import { Icon } from '../Icon';
import { Loader } from '../Loader';
import { NavTabs, EditButton, SEOInsights, DevMode } from '..';

export const DocumentPanel = ({ loading, documents, queries, onDocumentClick }) => {
  if (!documents || (documents && documents.length <= 0)) return null;

  return (
    <BasePanel className="DocumentPanel">
      <ToolbarHeader />
      { loading
        ? <Loader />
        : panelContent(documents, queries, onDocumentClick)
      }
    </BasePanel>
  );
};

const panelContent = (documents, queries, onDocumentClick) => {
  const tabsName = ['Edit Button', 'SEO Insights'];
  const tabsContent = [
    <EditButton
      documents={documents}
      maxTitleSize={35}
      maxSummarySize={150}
      onClick={onDocumentClick}
    />,
    <SEOInsights />
  ];

  // If there is no queries then, we don't display the json.
  if (queries && queries.length > 0) {
    tabsName.push('Dev Mode');
    tabsContent.push(
      <DevMode maxStringSize={35} queries={queries} />
    );
  }

  return (
    <NavTabs
      tabsName={tabsName}
      tabsContent={tabsContent}
    />
  );
};

const ToolbarHeader = () => (
  <div className="toolbar-header">
    <div className="wrapper-icon">
      <div className="background-icon">
        <Icon src={prismicWhiteSvg} />
      </div>
    </div>

    <div className="wrapper-title">
      <h2>Prismic Toolbar</h2>
      <h1>Document on this page</h1>
    </div>
  </div>
);
