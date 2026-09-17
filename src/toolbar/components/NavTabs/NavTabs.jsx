import { Component } from "react"
import { Tab, Tabs, TabList, TabPanel } from "react-tabs"

/* ----- BEGINNING OF CLASS ----- */
export class NavTabs extends Component {
	constructor(props) {
		super(props)
		this.state = { activeTab: 0, tabsName: props.tabsName, tabsContent: props.tabsContent }
	}

	/* ----- RENDER FUNCTION ----- */
	render() {
		const { tabsName, tabsContent } = this.state

		return (
			<Tabs
				selectedIndex={this.state.activeTab}
				onSelect={(tabIndex) => this.setState({ activeTab: tabIndex })}
			>
				<TabList className="nav-tab-list">
					{tabsName.map((name) => (
						<Tab key={name}>{name}</Tab>
					))}
				</TabList>

				{tabsContent.map((content, index) => (
					<TabPanel key={tabsName[index]}> {content} </TabPanel>
				))}
			</Tabs>
		)
	}
}
