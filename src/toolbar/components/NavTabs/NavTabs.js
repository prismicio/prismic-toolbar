import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import "react-tabs/style/react-tabs.css";

export const NavTabs = ({ tabsName, tabsContent }) => (
   <Tabs>
      <TabList>
        {tabsName.map(name =>  <Tab>{name}</Tab>)}
      </TabList>

      {tabsContent.map(content => {
        return <TabPanel> {content} </TabPanel>
      })}
    </Tabs>
);
