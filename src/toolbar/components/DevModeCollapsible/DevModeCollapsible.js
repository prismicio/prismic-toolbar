import "./DevModeCollapsible.css";
import { Component } from 'preact';
import Collapsible from 'react-collapsible';
import React, { Fragment } from 'react'
import ReactJson from 'react-json-view';

export class DevModeCollapsible extends Component{
  constructor (props) {
    super(props);
    this.state = {docData : props.docData }
  }

  render() {
    const { docData } = this.state;
    if(!docData){return(<div className="dev-mode__no-queries"> There are no queries available right now, please reload the page</div>)}

    return (
      <Fragment>
      {
      docData.map(query => {
        const triggerInfo = getTriggerInfo(query);

        return (
          <Collapsible
            trigger={<Trigger title={triggerInfo.title} nbLinkedDoc={triggerInfo.nbLinkedDoc} />}
            triggerWhenOpen={<Trigger title={triggerInfo.title} nbLinkedDoc={triggerInfo.nbLinkedDoc} isOpen />}
            transitionTime={100}>

            <div className="wrapper-json">
              {query.map(doc =>
                <ReactJson
                    src={doc.data}
                    name={doc.uid || doc.type}
                    iconStyle='square'
                    collapsed={1}
                    indentWidth={1}
                    displayDataTypes={false}
                    enableClipboard={false}
                    displayObjectSize={false}
                    collapseStringsAfterLength={15}
                    theme={{
                     // check --https://github.com/chriskempson/base16/blob/master/styling.md-- for info on how to build a theme
                      base00: "#F5F6F9", // whole background
                      base01: "#ddd",
                      base02: "#ddd", // line on the left
                      base03: "#444",
                      base04: "purple",
                      base05: "#444",
                      base06: "#444",
                      base07: "#444",
                      base08: "#FF0000",
                      base09: "rgba(70, 70, 230, 1)",
                      base0A: "rgba(70, 70, 230, 1)",
                      base0B: "rgba(70, 70, 230, 1)",
                      base0C: "rgba(70, 70, 230, 1)",
                      base0D: "#5163BA", // square on object open
                      base0E: "#3F4A56", // square on object closed
                      base0F: "rgba(70, 70, 230, 1)"
                    }}
                />
              )}
            </div>
          </Collapsible>
        )
      })}
      </Fragment>
    )
  }
}

const Trigger = ({ title, nbLinkedDoc, isOpen }) => (
    <div className="wrapper-trigger">
      <h2 className="trigger-title"> {title} </h2>
      <h3 className="trigger-subtitle">{nbLinkedDoc} linked documents</h3>
      <div className={isOpen ? "trigger-triangle active" : "trigger-triangle"}>&#9654;</div>
    </div>
)

const getTriggerInfo = docData => {
  if(!docData ){ return }

  const startValueReducer = {};
  /*
    expected format of triggerInfo
    {
      type1 : ...,
      type2 : ...,
      ...
    }
  */
  const triggerInfo = docData.map(doc => {
      const type = doc.type;
      return {type: type}
     }).reduce(
      triggerInfoReducer,
      startValueReducer
     )
  const title = constructTitle(triggerInfo);
  // expected format of title : (X) type 1 & (Y) type 2 ...
  const nbLinkedDoc = docData.map(doc => countLinkedDocInObject(doc.data)).reduce((acc, val) => acc + val);

  // expected to return title and number of linked docs
  return {title: title, nbLinkedDoc: nbLinkedDoc};
}

const constructTitle = triggerInfo => {
  if(!triggerInfo){return ""}

  let title = "";
  const copyInfo = JSON.parse(JSON.stringify(triggerInfo));

  const keys = Object.keys(copyInfo);
  const length = keys.length;
  keys.map((key, index) => {
    title += "(" + copyInfo[key] + ") " + key;
    if(index != length - 1){
      title += " & ";
    }
  })
  return title;
}

const triggerInfoReducer = (acc, val) => {
  if(acc[val.type]){
    acc[val.type] += 1;
  }else{
    acc[val.type] = 1;
  }
  return acc;
}

const countLinkedDocInObject = (data) => {
  if(!data){return 0} // First case data is empty or null
  if(data["link_type"] === "Document" && data["id"]){return 1} // Second case there is a document, return 1 to increment the count

  // Last case it is an object but not a document, so we check every object inside.
  var count = 0;
  var types = {};
  const keys = Object.keys(data);
  keys.forEach(key => {
    if(typeof data[key] === "object"){
      const newCount = countLinkedDocInObject(data[key]);
      count += newCount;
    }
  })
  return count;
}
