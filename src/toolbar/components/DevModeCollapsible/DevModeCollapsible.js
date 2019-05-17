import './DevModeCollapsible.css';
import { Component } from 'preact';
import Collapsible from 'react-collapsible';
import React, { Fragment } from 'react';
import { collapsibleArrow } from '.';
import { copyText } from 'common';
import { JsonView } from '..';

export class DevModeCollapsible extends Component{
  constructor (props) {
    super(props);
    this.state = { docData : props.docData }
  }

  render() {
    const { docData } = this.state;

    return (
      <div>
      {
        docData.map( (query, index) => {
          const triggerInfo = getTriggerInfo(query);

          return (
            <Collapsible
              trigger={<Trigger title={triggerInfo.title} nbLinkedDoc={triggerInfo.nbLinkedDoc} />}
              triggerWhenOpen={<Trigger title={triggerInfo.title} nbLinkedDoc={triggerInfo.nbLinkedDoc} isOpen />}
              transitionTime={100}>
              {query.map( (doc, index) => (
                  <JsonView
                    json={doc}
                    maxStringSize={25}
                  />
               )
              )}
            </Collapsible>
          )
        })
      }
      </div>
    )
  }
}

/* CONSTRUCTION OF THE TRIGGER(HEADER) FOR THE COLLAPSIBLE */
const Trigger = ({ title, nbLinkedDoc, isOpen }) => (
    <div className='wrapper-trigger'>
      <h2 className='trigger-title'> {title} </h2>
      <h3 className='trigger-subtitle'>{nbLinkedDoc} linked documents</h3>
      <img className={isOpen ? 'trigger-triangle active' : 'trigger-triangle'} src={collapsibleArrow} />
    </div>
)

const getTriggerInfo = docData => {
  if(!docData){ return }

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
  const nbLinkedDoc = docData.map( doc => countLinkedDocInObject(doc.data) ).reduce( (acc, val) => acc + val );

  // expected to return title and number of linked docs
  return { title: title, nbLinkedDoc: nbLinkedDoc };
}

const constructTitle = triggerInfo => {
  if(!triggerInfo){return ''}

  let title = '';
  const copyInfo = JSON.parse(JSON.stringify(triggerInfo));

  const keys = Object.keys(copyInfo);
  const length = keys.length;
  keys.map((key, index) => {
    title += key + ' (' + copyInfo[key] + ')';
    if(index != length - 1){
      title += ' & ';
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

const countLinkedDocInObject = data => {
  if(!data){return 0} // First case data is empty or null
  if(data['link_type'] === 'Document' && data['id']){return 1} // Second case there is a document, return 1 to increment the count

  // Last case it is an object but not a document, so we check every object inside.
  var count = 0;
  var types = {};
  const keys = Object.keys(data);
  keys.forEach(key => {
    if(typeof data[key] === 'object'){
      const newCount = countLinkedDocInObject(data[key]);
      count += newCount;
    }
  })
  return count;
}
