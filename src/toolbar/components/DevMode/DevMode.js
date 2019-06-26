import './DevMode.css';
import { Component } from 'preact';
import Collapsible from 'react-collapsible';
import { collapsibleArrow } from '.';
import { JsonView } from '..';

/* ----- BEGINNING OF CLASS ----- */
export class DevMode extends Component {
  constructor (props) {
    super(props);
    this.state = { queries: props.queries };
  }

  /* ----- RETURN TRIGGER INFOS ----- */
  getitemInfos = /* Object */query => /* Object */ {
    // reducer to count the custom types queried
    const itemInfosReducer = (acc, val) => {
      if (acc[val]) {
        acc[val] += 1;
      } else {
        acc[val] = 1;
      }
      return acc;
    };

    /*
      expected format of itemInfos
      {
        type1 : ...,
        type2 : ...,
        ...
      }
    */
    const itemInfos = query
      .map(doc => doc.type)
      .reduce(
        itemInfosReducer,
        {}
      );

    const title = this.constructTitleOfItem(itemInfos);

    // expected format of title : (X) type 1 & (Y) type 2 ...
    const nbLinkedDoc = query
      .map(doc => this.countLinkedDocInDocument(doc.data))
      .reduce((acc, val) => acc + val);

    // expected to return title and number of linked docs
    return { title, nbLinkedDoc };
  }


  /* ----- CONSTRUCT TITLE BASED ON TYPES AND OCCURRENCES -----*/
  constructTitleOfItem = /* Object */itemInfos => /* String */ {
    const copyInfo = Object.assign({}, itemInfos);
    const keys = Object.keys(copyInfo);

    function titleReducer(acc, val) {
      return acc + ' & ' + val;
    }

    const title = keys
      .map(key => key + ' (' + copyInfo[key] + ')')
      .reduce(titleReducer);

    return title;
  }


  /* ----- RETURN NUMBER OF LINKED DOCUMENT FOR A QUERY ----- */
  countLinkedDocInDocument = /* Object */data => /* Int */ {
    if (!data) { return 0; } // First case data is empty or null
    if (data.link_type === 'Document' && data.id) { return 1; } // Second case there is a document, return 1 to increment the count

    const linkedDocReducer = (/* Int */acc, /* Object || String */key) => {
      if (typeof data[key] === 'object') {
        const newCount = this.countLinkedDocInDocument(data[key]);
        return acc + newCount;
      }
      return acc;
    };

    // Last case it is an object but not a document, so we check every object inside.
    const count = Object.keys(data)
      .reduce(linkedDocReducer, 0);

    return count;
  }


  /* ----- RENDER FUNCTION ----- */
  render() {
    const { queries } = this.state;

    return (
      <div>
        {
        queries.map(query => {
          if (Object.keys(query).length < 1) { return null; }
          const itemInfos = this.getitemInfos(query);

          return (
            <Collapsible
              trigger={<DevModeItem
                title={itemInfos.title}
                nbLinkedDoc={itemInfos.nbLinkedDoc}
              />}
              triggerWhenOpen={<DevModeItem
                title={itemInfos.title}
                nbLinkedDoc={itemInfos.nbLinkedDoc}
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

/* ----- HEADER(TRIGGER) FOR THE COLLAPSIBLE  ----- */
const DevModeItem = ({ title, nbLinkedDoc, isOpen }) => (
  <div className='wrapper-trigger'>
    <h2 className='trigger-title'> {title} </h2>
    <h3 className='trigger-subtitle'>{nbLinkedDoc} linked documents</h3>
    <img className={isOpen ? 'trigger-triangle active' : 'trigger-triangle'} src={collapsibleArrow} />
  </div>
);
