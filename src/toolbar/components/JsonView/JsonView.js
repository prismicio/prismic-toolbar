import { Component } from 'preact';
import { Treebeard } from 'react-treebeard';
import { minusSquare, plusSquare } from '.';
import { copyText } from '@common';
import './JsonView.css';

/* ----- BEGINNING OF CLASS ----- */
export class JsonView extends Component {
  constructor (props) {
    super(props);
    const data = this.getData(props.json);
    const metadata = this.getMetadata(props.json);
    this.maxStringSize = props.maxStringSize;
    this.bannerUid = this.constructBannerUid(props.json);
    this.state = {
      data,
      metadata,
      nodeCopied: [],
      timeOut: -1
    };
  }


  /* ----- TOGGLE FUNCTION ----- */
  onToggle = (/* Object */node, /* Boolean */toggled) => {
    node.toggled = toggled;
    this.setState(oldState => oldState);
  }


  /* ----- COPY JSON PATH TO CLIPBOARD AND REMOVE OLD COPY ----- */
  copyToClipboard = /* Object */node => {
    const { data, metadata, nodeCopied, timeOut } = this.state;

    if (nodeCopied !== node) {
      nodeCopied.path ? this.removeOldCopied(data, metadata, nodeCopied) : null;

      const newJsonToModify = this.getWhichJsonToSet(data, metadata, node.path);
      this.setIsCopied(newJsonToModify, node.path, true);

      const jsonPath = node.path.join('.');
      copyText(jsonPath);

      if (timeOut > -1) {
        clearTimeout(timeOut);
      }

      const newTimeOut = setTimeout(() => {
        this.removeOldCopied(data, metadata, node);
        this.setState({
          data,
          metadata,
          nodeCopied: [],
          timeOut: -1
        });
      }, 1500);

      this.setState({
        data,
        metadata,
        nodeCopied: node,
        timeOut: newTimeOut
      });
    }
  }


  /* ----- FUNCTION TO RETURN WHICH DATA TO SET ----- */
  getWhichJsonToSet(
    /* Object */data,
    /* Object */metadata,
    /* List[String] */keyNames
  ) /* Object */ {
    if (!keyNames) { return; }
    if (keyNames[0] === 'data') {
      return data;
    }
    return metadata;
  }

  /* ----- FUNCTION TO MODIFY THE ISCOPIED PROPERTY OF A NODE ----- */
  setIsCopied(
    /* Object */json,
    /* List[String] */keyNames,
    /* Boolean */value
  ) {
    // return if there is previous nodeCopied.
    if (!keyNames) { return; }
    const { length } = keyNames;

    // reducer to find the data we need to modify in the json
    const reducer = (
      /* Object */acc,
      /* String */key,
      /* Int */index
    ) => /* Object */ {
      const nodeFound = acc.find(node => node.name === key);
      if (index === length - 1) { // return the node itself if it is the last key in the path.
        return nodeFound;
      } // return the children if it is not the last key in the path
      return nodeFound.children;
    };

    const nodeToModify = keyNames.reduce(reducer, json);
    nodeToModify.isCopied = value;
  }


  /* ----- FUNCTION TO REMOVE THE OLD COPY ----- */
  removeOldCopied = (
    /* Object */data,
    /* Object */metadata,
    /* Object */nodeCopied
  ) => {
    const oldJsonToModify = this.getWhichJsonToSet(data, metadata, nodeCopied.path);
    this.setIsCopied(oldJsonToModify, nodeCopied.path, false);
  }


  /* ----- DECORATORS THAT DEFINE HOW THE JSON IS RENDERED ----- */
  decorators = {
    Icon: props => {
      // if node has children property then it's an object
      if (props.node.children && props.node.children.length > 0) {
        return <img className="icon-toggle" onClick={props.onClick} src={props.node.toggled ? minusSquare : plusSquare} />;
      }
    },

    Key: props =>
    // different style are applied to objects and key-value
      (
        <span
          className={props.node.children ? 'key-object' : 'key-string'}
          onClick={props.onClick}
          >
          { props.node.name }:{props.node.children && props.node.children.length === 0 ? ' []' : '' }&nbsp;
        </span>
      ),

    Value: props => {
      // if node has children then it's an object, an object has no value field
      if (!props.node.children) {
        return (
          <span
            className="value-string"
            onClick={props.onClick}>
            {`"${props.stringCheck(props.node.value)}"`}
          </span>
        );
      }
    },

    NestedBorder: props => {
      if (props.node.path.length > 1) { // no border on the root of the json
        // if the node is the last child then it has only a half vertical border
        if (props.node.isLastChild) {
          // right margin if key-value
          return (
            <div
              className={props.node.children && props.node.children.length > 0 ? 'border last-nested' : 'border last-nested with-right-margin'} />
          );
        }
        return (
          <div
            className={props.node.children && props.node.children.length > 0 ? 'border horizontal' : 'border horizontal with-right-margin'}
             />
        );
      }
    },

    Copy: props => (
      <span
        className="copy-button"
        onClick={() => this.copyToClipboard(props.node)}
          >
        {props.node.isCopied ? 'Copied' : 'Copy'}
      </span>
    ),

    Container: props =>
    // The container decorator will be applied to each node of the json (root and nested)
      (
        <div className="json-view-container" >
          <this.decorators.NestedBorder node={props.node} />
          <this.decorators.Icon node={props.node} onClick={props.onClick} />
          <this.decorators.Key node={props.node} onClick={props.onClick} />
          <this.decorators.Value
            node={props.node}
            onClick={props.onClick}
            stringCheck={this.stringCheck}
          />
          <this.decorators.Copy node={props.node} />
        </div>
      )
  }


  /* ----- STYLE APPLIED TO THE TREEBEARD COMPONENT ----- */
  style = {
    tree: {
      base: {
        listStyle: 'none',
        backgroundColor: '#F5F6F9',
        margin: 0,
        padding: '15px 25px 15px 25px'
      },
      node: {
        base: {
          position: 'relative',
          left: '15px',
          maxWidth: 'calc(100% - 15px)'
        },
        subtree: {
          listStyle: 'none',
          marginLeft: '5px',
          paddingLeft: '0px'
        }
      }
    }
  }


  /* ----- TRANSFORM RAW JSON TO JSON FOR TREEBEARD COMPONENT ----- */
  turnJsonToTreeBeardJson = (/* Object */json, /* List[String] */path) => /* Object */ {
    if (!json) { return; }
    const copyOfJson = Object.assign({}, json);
    const keys = Object.keys(json);
    const { length } = keys;

    const res = keys.map((key, index) => {
      if (typeof copyOfJson[key] === 'object' && copyOfJson[key] != null) { // is an object
        return {
          name: key,
          toggled: false,
          isCopied: false,
          children: this.turnJsonToTreeBeardJson(copyOfJson[key], path.concat(key)),
          path: path.concat(key),
          isLastChild: this.isLastChild(index, length)
        };
      } // is a key : string
      return {
        name: key,
        value: copyOfJson[key] || 'null',
        path: path.concat(key),
        isCopied: false,
        isLastChild: this.isLastChild(index, length)
      };
    });
    return res;
  }


  /* ----- CHECK IF THE NODE IS THE LAST CHILD FOR THE VERTICAL BORDER ----- */
  isLastChild = (/* Int */index, /* Int */length) => /* Boolean */ {
    if (index === length - 1) {
      return true;
    }
    return false;
  }


  /* ----- RETURN THE DATA & METADATA FOR THE TREEBEARD----- */
  getMetadata = /* Object */json => /* Object */ {
    const copyOfJson = Object.assign({}, json);
    delete copyOfJson.data;
    const metadata = this.turnJsonToTreeBeardJson(copyOfJson, []);
    return metadata;
  }

  getData = /* Object */json => /* Object */ {
    const copyOfData = Object.assign({}, json.data);
    const rawData = { data: copyOfData };
    const data = this.turnJsonToTreeBeardJson(rawData, []);
    data[0].toggled = true; // to initially open data
    return data;
  }

  constructBannerUid = /* Object */json => /* String */ {
    const { type } = json;
    const uid = json.uid ? ' · ' + json.uid : '';
    return type + uid;
  }


  /* ----- ADD ELLIPSIS IF NECESSARY TO VALUE ----- */
  stringCheck = string => /* String */ {
    if (string.length >= this.maxStringSize) {
      return (string.substring(0, this.maxStringSize) + '...');
    }
    return string;
  }


  /* ----- RENDER FUNCTION ----- */
  render() {
    const { data, metadata } = this.state;

    return (
      <div className='wrapper-json-view' >
        <div className='banner-uid' >{this.bannerUid}</div>

        <Treebeard
          data={data}
          onToggle={this.onToggle}
          decorators={this.decorators}
          style={this.style}
        />

        <div className='banner-metadata' > Metadata </div>

        <Treebeard
          data={metadata}
          onToggle={this.onToggle}
          decorators={this.decorators}
          style={this.style}
        />
      </div>
    );
  }
}
