import "./DevModeCollapsible.css";
import { Component } from 'preact';

export class DevModeCollapsible extends Component{
  constructor (props) {
    super(props);
    this.state = { activeTab : 0, tabsName : props.tabsName, tabsContent : props.tabsContent }
  }

  render() {
    const { activeTab, tabsName, tabsContent } = this.state;

    return (
       <div></div>
    )
  }
}
