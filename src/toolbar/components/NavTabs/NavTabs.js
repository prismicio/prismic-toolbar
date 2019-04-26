import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import "./NavTabs.css"

export const NavTabs = ({ tabsName, tabsContent }) => (
   <Tabs>
      <TabList className="TabList">
        {tabsName.map(name => <CustomTabName name={name}  /> )}
      </TabList>

      {
        tabsContent.map(content =>  <TabPanel> {content} </TabPanel>)
      }
    </Tabs>
);

const CustomTabName = ({ name }) => {



  return(
    <Tab className="Tab"> {name} </Tab>
  )
}
CustomTabName.tabsRole = 'Tab';

