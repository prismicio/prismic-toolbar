import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import './NavTabs.css';
import { Component } from 'react';

/* ----- BEGINNING OF CLASS ----- */
export class NavTabs extends Component {
  constructor (props) {
    super(props);
    this.state = { activeTab: 0, tabsName: props.tabsName, tabsContent: props.tabsContent };
  }

  /* ----- RENDER FUNCTION ----- */
  render() {
    const { tabsName, tabsContent } = this.state;

    return (
      <Tabs
        selectedIndex={this.state.activeTab}
        onSelect={tabIndex => this.setState({ activeTab: tabIndex })}
        >
        <TabList className="nav-tab-list">
          {tabsName.map(name =>
            <Tab>{name}</Tab>
          )}
        </TabList>

        {
          tabsContent.map(content => <TabPanel> {content} </TabPanel>)
        }
      </Tabs>
    );
  }
}
