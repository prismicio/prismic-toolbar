import { Component } from 'preact';
import { Treebeard } from 'react-treebeard';
import { minusSquare, plusSquare, copyIcon} from '.';
import { copyText } from 'common';
import React, { Fragment } from 'react';
import './JsonView.css';

function hello() {


}


const hello = () => <h1>Hello</h1>

/* ----- BEGINNING OF CLASS ----- */
export class JsonView extends Component {
  constructor (props) {
    super(props);
    const data = this.getData(props.json);
    const metadata = this.getMetadata(props.json);
    this.maxStringSize = props.maxStringSize;
    this.bannerUid = this.constructBannerUid(props.json);
    this.state = {
      data: data,
      metadata: metadata,
      nodeCopied: []
    }
  }


  /* ----- TOGGLE FUNCTION ----- */
  onToggle = (node, toggled) => {
      node.toggled = toggled
      this.setState(oldState => oldState)
  }


  /* ----- COPY JSON PATH TO CLIPBOARD ----- */
  copyToClipboard = (node) => {
     const { nodeCopied } = this.state;
     if(nodeCopied != node){
        nodeCopied.isCopied = false;
        const jsonPath = node.path.join('.');
        copyText(jsonPath);
        node.isCopied = true;
        this.setState(oldState => oldState.nodeCopied = node );
        console.log(node)
        console.log(nodeCopied)
        console.log(this.state)
     }
  }


  /* ----- DECORATORS THAT DEFINE HOW THE JSON IS RENDERED ----- */
  decorators = {
     Icon: (props) => {
       // if node has children then it's an object, an object has an icon + or - if he has children
       if(props.node.children && props.node.children.length > 0) {
         return <img className="icon-toggle" onClick={props.onClick} src={props.node.toggled ? minusSquare : plusSquare} />
       }
     },

     Key: (props) => {
        // different style are applied to objects and key-value
        return (
          <span
            className={props.node.children ? 'key-object' : 'key-string'}
            onClick={props.onClick}
          >
            { props.node.name }:{props.node.children && props.node.children.length === 0 ? ' []' : '' }&nbsp;
          </span>
        )
     },

     Value: (props) => {
       if(!props.node.children) { // if node has children then it's an object, an object has no value field
         return <span className="value-string" onClick={props.onClick} >{`"${this.checkStringLength(props.node.value)}"`}</span>
       }
     },

     NestedBorder: (props) => {
       if(props.node.path.length > 1) { // no border on the root of the json
         if(props.node.isLastChild) { // if the node is the last child then it has only a half vertical border
           // an key-value node has a right margin next to the border, an object does not if he has children
           return (
             <div
              className={props.node.children && props.node.children.length > 0 ? 'last-nested-child-border' : 'last-nested-child-border with-right-margin'}
             ></div>
           )
         } else {
           return (
            <div
              className={props.node.children && props.node.children.length > 0 ? 'horizontal-border' : 'horizontal-border with-right-margin'}
            ></div>
           )
         }
       }
     },

     Copy: (props) => {
       if(props.node.isCopied) {

       } else {
        return <img className="icon-copy" onClick={ () => this.copyToClipboard(props.node) } src={copyIcon} />
       }
     },

     Container: (props) => {
         // The container decorator will be applied to each node of the json (root and nested)
         return (
            <div className="json-view-container" >
               <this.decorators.NestedBorder node={props.node} />
               <this.decorators.Icon node={props.node} onClick={props.onClick} />
               <this.decorators.Key node={props.node} onClick={props.onClick} />
               <this.decorators.Value node={props.node} onClick={props.onClick} />
               <this.decorators.Copy node={props.node} />
            </div>
         );
     }
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
                 left: '15px'
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
  turnJsonToTreeBeardJson = (json, path) => {
    if(!json){return}
    const copyOfJson = JSON.parse(JSON.stringify(json))
    const keys = Object.keys(json)
    const length = keys.length;

    const res = keys.map( (key, index) => {
      if(typeof copyOfJson[key] === 'object' && copyOfJson[key] != null) { // is an object
        return {
          name: key,
          toggled: false,
          isCopied: false,
          children: this.turnJsonToTreeBeardJson(copyOfJson[key], path.concat(key)),
          path: path.concat(key),
          isLastChild: this.isLastChild(index, length)
        }
      } else { // is a key : string
        return {
          name: key,
          value: copyOfJson[key] || 'null',
          path: path.concat(key),
          isCopied: false,
          isLastChild: this.isLastChild(index, length)
        }
      }
    })
    return res
  }


  /* ----- CHECK IF THE NODE IS THE LAST CHILD FOR THE VERTICAL BORDER ----- */
  isLastChild = (index, length) => {
    if(index === length - 1) {
      return true;
    } else {
      return false;
    }
  }


  /* ----- RETURN THE DATA & METADATA FOR THE TREEBEARD----- */
  getMetadata = json => {
    const copyOfJson = JSON.parse(JSON.stringify(json));
    delete copyOfJson.data;
    const metadata = this.turnJsonToTreeBeardJson(copyOfJson, []);
    return metadata;
  }

  getData = json => {
    const copyOfData = JSON.parse(JSON.stringify(json.data));
    const rawData = { data: copyOfData }
    const data = this.turnJsonToTreeBeardJson(rawData, []);
    data[0].toggled = true; // to initially open data
    return data
  }

  constructBannerUid = json => {
    const type = json.type
    const uid = json.uid ? ' · '+ json.uid : ''
    return type + uid
  }


  /* ----- ADD ELLIPSIS IF NECESSARY TO VALUE ----- */
  checkStringLength = string => {
    if(string.length >= this.maxStringSize) {
      return(string.substring(0, this.maxStringSize) + '...')
    } else {
      return string;
    }
  }


  /* ----- RENDER FUNCTION ----- */
  render() {
    const { data, metadata } = this.state

    return(
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
    )
  }
}
