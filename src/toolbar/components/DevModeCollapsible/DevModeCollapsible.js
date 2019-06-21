import './DevModeCollapsible.css';
import { Component } from 'preact';
import Collapsible from 'react-collapsible';
import { collapsibleArrow } from '.';
import { JsonView } from '..';

/* ----- BEGINNING OF CLASS ----- */
export class DevModeCollapsible extends Component {
  constructor (props) {
    super(props);
    this.state = { queries: props.queries };
  }


  /* ----- TRIGGER(HEADER) FOR THE COLLAPSIBLE  ----- */
  Trigger = ({ title, nbLinkedDoc, isOpen }) => (
    <div className='wrapper-trigger'>
      <h2 className='trigger-title'> {title} </h2>
      <h3 className='trigger-subtitle'>{nbLinkedDoc} linked documents</h3>
      <img className={isOpen ? 'trigger-triangle active' : 'trigger-triangle'} src={collapsibleArrow} />
    </div>
  )


  /* ----- RETURN TRIGGER INFOS ----- */
  getTriggerInfo = queries => {
    if (!queries) { return; }

    // reducer to count the custom types queried
    const triggerInfoReducer = (acc, val) => {
      if (acc[val.type]) {
        acc[val.type] += 1;
      } else {
        acc[val.type] = 1;
      }
      return acc;
    };

    /*
      expected format of triggerInfo
      {
        type1 : ...,
        type2 : ...,
        ...
      }
    */
    const triggerInfo = queries.map(doc => {
      const { type } = doc;
      return { type };
    }).reduce(
      triggerInfoReducer,
      {}
    );

    const title = this.constructTitle(triggerInfo);

    // expected format of title : (X) type 1 & (Y) type 2 ...
    const nbLinkedDoc = queries
      .map(doc => this.countLinkedDocInObject(doc.data))
      .reduce((acc, val) => acc + val);

    // expected to return title and number of linked docs
    return { title, nbLinkedDoc };
  }


  /* ----- CONSTRUCT TITLE BASED ON TYPES AND OCCURRENCES -----*/
  constructTitle = triggerInfo => {
    if (!triggerInfo) { return ''; }

    let title = '';
    const copyInfo = JSON.parse(JSON.stringify(triggerInfo));

    const keys = Object.keys(copyInfo);
    const { length } = keys;
    keys.forEach((key, index) => {
      title += key + ' (' + copyInfo[key] + ')';
      index !== length - 1 ? title += ' & ' : '';
    });

    return title;
  }


  /* ----- RETURN NUMBER OF LINKED DOCUMENT FOR A QUERY ----- */
  countLinkedDocInObject = data => {
    if (!data) { return 0; } // First case data is empty or null
    if (data.link_type === 'Document' && data.id) { return 1; } // Second case there is a document, return 1 to increment the count

    // Last case it is an object but not a document, so we check every object inside.
    let count = 0;
    const keys = Object.keys(data);

    keys.forEach(key => {
      if (typeof data[key] === 'object') {
        const newCount = this.countLinkedDocInObject(data[key]);
        count += newCount;
      }
    });
    return count;
  }


  /* ----- RENDER FUNCTION ----- */
  render() {
    const { queries } = this.state;

    return (
      <div>
        {
        queries.map(query => {
          const triggerInfo = this.getTriggerInfo(query);

          return (
            <Collapsible
              trigger={<this.Trigger
                title={triggerInfo.title}
                nbLinkedDoc={triggerInfo.nbLinkedDoc}
              />}
              triggerWhenOpen={<this.Trigger
                title={triggerInfo.title}
                nbLinkedDoc={triggerInfo.nbLinkedDoc}
                isOpen
              />}
              transitionTime={100}>
              {query.map(doc => (
                <JsonView
                  json={doc}
                  maxStringSize={25}
                  />
              )
              )}
            </Collapsible>
          );
        })
      }
      </div>
    );
  }
}
