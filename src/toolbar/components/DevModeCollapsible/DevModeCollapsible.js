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

  /* ----- RETURN TRIGGER INFOS ----- */
  getItemInfos = /* Object */query => /* Object */ {
    if (!query) { throw new Error('Error on getItemInfos()'); }

    // reducer to count the custom types queried
    const itemInfosReducer = (acc, val) => {
      if (acc[val.type]) {
        acc[val.type] += 1;
      } else {
        acc[val.type] = 1;
      }
      return acc;
    };

    /*
      expected format of ItemInfos
      {
        type1 : ...,
        type2 : ...,
        ...
      }
    */
    const ItemInfos = query.map(doc => {
      const { type } = doc;
      return { type };
    }).reduce(
      itemInfosReducer,
      {}
    );

    const title = this.constructTitleOfDocument(ItemInfos);

    // expected format of title : (X) type 1 & (Y) type 2 ...
    const nbLinkedDoc = query
      .map(doc => this.countLinkedDocInDocument(doc.data))
      .reduce((acc, val) => acc + val);

    // expected to return title and number of linked docs
    return { title, nbLinkedDoc };
  }


  /* ----- CONSTRUCT TITLE BASED ON TYPES AND OCCURRENCES -----*/
  constructTitleOfDocument = /* Object */ItemInfos => /* String */ {
    if (!ItemInfos) { return ''; }

    let title = '';
    const copyInfo = JSON.parse(JSON.stringify(ItemInfos));

    const keys = Object.keys(copyInfo);
    const { length } = keys;
    keys.forEach((key, index) => {
      title += key + ' (' + copyInfo[key] + ')';
      index !== length - 1 ? title += ' & ' : '';
    });

    return title;
  }


  /* ----- RETURN NUMBER OF LINKED DOCUMENT FOR A QUERY ----- */
  countLinkedDocInDocument = /* Object */data => /* Int */ {
    if (!data) { return 0; } // First case data is empty or null
    if (data.link_type === 'Document' && data.id) { return 1; } // Second case there is a document, return 1 to increment the count

    // Last case it is an object but not a document, so we check every object inside.
    let count = 0;
    const keys = Object.keys(data);

    keys.forEach(key => {
      if (typeof data[key] === 'object') {
        const newCount = this.countLinkedDocInDocument(data[key]);
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
          if (!query || Object.keys(query).length <= 0) { return; }

          const ItemInfos = this.getItemInfos(query);

          return (
            <Collapsible
              trigger={<DevModeItem
                title={ItemInfos.title}
                nbLinkedDoc={ItemInfos.nbLinkedDoc}
              />}
              triggerWhenOpen={<DevModeItem
                title={ItemInfos.title}
                nbLinkedDoc={ItemInfos.nbLinkedDoc}
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
