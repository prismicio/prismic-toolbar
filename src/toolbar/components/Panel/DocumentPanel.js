import { BasePanel, prismicWhiteSvg } from '.';
import { Icon } from '../Icon';
import { Loader } from '../Loader';
import { NavTabs, EditButton, DevMode } from '..';

export const DocumentPanel = ({ loading, documents, queries }) => {
  if (!documents || (documents && documents.length <= 0)) return null;

  return (
    <BasePanel className="DocumentPanel">
      <ToolbarHeader />
      { loading
        ? <Loader />
        : panelContent(documents, queries)
      }
    </BasePanel>
  );
};

const panelContent = (documents, queries) => {
  // If there is no queries then, we don't display the json.
  if (queries && queries.length > 0) {
    return (
      <NavTabs
        tabsName={['Edit Button', 'Dev Mode']}
        tabsContent={[
          <EditButton
            documents={documents}
            maxTitleSize={35}
            maxSummarySize={150}
          />,
          <DevMode queries={queries} />
        ]}
      />
    );
  }
  return (
    <EditButton
      documents={documents}
      maxTitleSize={35}
      maxSummarySize={150}
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
