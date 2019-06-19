import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import "./NavTabs.css";
import { Component } from 'preact';

/* ----- BEGINNING OF CLASS ----- */
export class NavTabs extends Component{
  constructor (props) {
    super(props);
    this.CustomTabName.tabsRole = 'Tab';
    this.state = { activeTab : 0, tabsName : props.tabsName, tabsContent : props.tabsContent }
  }


  CustomTabName = ({ name, isActive }) => {
    return(
      <Tab className={isActive ? "nav-tab active": "nav-tab"} > {name} </Tab>
    )
  }


  /* ----- RENDER FUNCTION ----- */
  render() {
    const { activeTab, tabsName, tabsContent } = this.state;

    return (
       <Tabs
        selectedIndex={this.state.activeTab}
        onSelect={tabIndex => this.setState({ activeTab: tabIndex })}
        >
          <TabList className="nav-tab-list">
            {tabsName.map( (name, index) => <this.CustomTabName name={name} isActive={index === activeTab} /> )}
          </TabList>

          {
            tabsContent.map(content =>  <TabPanel> {content} </TabPanel>)
          }
        </Tabs>
    )
  }
}
