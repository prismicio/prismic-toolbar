import './SEOInsights.css';
import { Component } from 'react';
import { Icon } from '../Icon';
import { infoSvg, okSvg, warnSvg, errorSvg } from '.';

/* ----- BEGINNING OF CLASS ----- */
export class SEOInsights extends Component {
  insights = null;

  constructor (props) {
    super(props);
    this.refreshInsights();
  }

  refreshInsights() {
    const result = {
      meta: {
        title: null,
        description: null,
        image: null,
        openGraph: {
          title: null,
          description: null,
          image: null
        },
        twitter: {
          title: null,
          description: null,
          image: null
        }
      }
    };

    const getMetaPropertySafely = (selector, property) => {
      try {
        const tag = document.querySelector(`head ${selector}`);
        return tag ? tag[property] : null;
      } catch (e) {
        return null;
      }
    };

    result.meta.title = getMetaPropertySafely('title', 'innerText');
    result.meta.description = getMetaPropertySafely('meta[name="description"]', 'content');

    result.meta.openGraph.title = getMetaPropertySafely('meta[property="og:title"]', 'content');
    result.meta.openGraph.description = getMetaPropertySafely('meta[property="og:description"]', 'content');
    // We give open graph priority to define global meta image
    result.meta.image = result.meta.openGraph.image = getMetaPropertySafely('meta[property="og:image"]', 'content');

    result.meta.twitter.title = getMetaPropertySafely('meta[name="twitter:title"]', 'content');
    result.meta.twitter.description = getMetaPropertySafely('meta[name="twitter:description"]', 'content');
    result.meta.twitter.image = getMetaPropertySafely('meta[name="twitter:image"]', 'content');

    this.insights = result;
  }

  /* ----- RENDER FUNCTION ----- */
  render() {
    if (!this.insights) {
      return (<div className="seo-insights-tab">
        <article>
          <h4>Loading SEO Insights...</h4>
        </article>
      </div>);
    }

    return (
      <div className="seo-insights-tab">
        { DisplayMetaTitle(this.insights) }
        { DisplayMetaDescription(this.insights) }
        <DisplayMetaImage insights={this.insights} />
        { DisplayMetaDebuggers() }
      </div>
    );
  }
}

const Protocol = {
  openGraph: 'Open Graph',
  twitter: 'Twitter'
};

const Meta = {
  title: 'page title',
  description: 'page description',
  image: 'page social image',
};

const ucFirst = str => str.charAt(0).toUpperCase() + str.slice(1);

const DisplayEmpty = (meta, value) => {
  let className = 'hint error';
  let message = `${ucFirst(meta)} not found`;
  let icon = errorSvg;

  if (value === '') {
    className = 'hint warn';
    message = `${ucFirst(meta)} is empty`;
    icon = warnSvg;
  }

  return (
    <figure>
      <blockquote className={className} title={message}>
        <Icon src={icon} /> {message}
      </blockquote>
    </figure>
  );
};

const DisplayHint = (protocol, meta, value) => {
  let className = 'hint error';
  let title = `${protocol} meta tag not found for ${meta}`;
  let icon = errorSvg;

  if (value === '') {
    className = 'hint warn';
    title = `${protocol} meta tag is empty for ${meta}`;
    icon = warnSvg;
  }

  if (value) {
    className = 'hint ok';
    title = `${protocol} meta tag is correctly set for ${meta}`;
    icon = okSvg;
  }

  return (
    <span
      className={className}
      title={title}
    >
      {protocol} <Icon src={icon} />
    </span>
  );
};

const DisplayMetaTitle = insights => (
  <article className="metaTitle">
    <h4>
      Page Title
      <a
        target="_blank"
        rel="noopener"
        href="https://developers.google.com/search/docs/advanced/appearance/good-titles-snippets#page-titles"
        title="Learn more about page title"
      >More info <Icon src={infoSvg} /></a>
    </h4>
    {
      insights.meta.title ? (
        <figure>
          <blockquote>{ insights.meta.title }</blockquote>
          <figcaption>
            <span
              className="hint"
              title="Google typically displays the first 50-60 characters of the page title"
            >
              Title Length: { insights.meta.title.length }
            </span> - {
              DisplayHint(Protocol.openGraph, Meta.title, insights.meta.openGraph.title)
            } - {
              DisplayHint(Protocol.twitter, Meta.title, insights.meta.twitter.title)
            }
          </figcaption>
        </figure>
      ) : DisplayEmpty(Meta.title, insights.meta.title)
    }
  </article>
);

const DisplayMetaDescription = insights => (
  <article className="metaDescription">
    <h4>
      Page Description
      <a
        target="_blank"
        rel="noopener"
        href="https://developers.google.com/search/docs/advanced/appearance/good-titles-snippets#meta-descriptions"
        title="Learn more about page description"
      >More info <Icon src={infoSvg} /></a>
    </h4>
    {
      insights.meta.description ? (
        <figure>
          <blockquote>{ insights.meta.description }</blockquote>
          <figcaption>
            <span
              className="hint"
              title="Google typically displays the first 155-160 characters of the page description"
            >
              Description Length: { insights.meta.description.length }
            </span> - {
              DisplayHint(
                Protocol.openGraph,
                Meta.description,
                insights.meta.openGraph.description
              )
            } - {
              DisplayHint(
                Protocol.twitter,
                Meta.description,
                insights.meta.twitter.description
              )
            }
          </figcaption>
        </figure>
      ) : DisplayEmpty(Meta.description, insights.meta.description)
    }
  </article>
);

class DisplayMetaImage extends Component {
  insights = null;

  state = { ref: null, width: null, height: null, ratio: null };

  constructor (props) {
    super(props);
    this.insights = props.insights;
  }

  onImageChange = node => {
    if (node) {
      node.onload = () => {
        this.setState({
          ref: node,
          width: node?.naturalWidth,
          height: node?.naturalHeight,
          ratio: `1:${(Math.ceil(node?.naturalWidth / node?.naturalHeight * 100) / 100).toFixed(2)}`
        });
      };
      node.src = this.insights.meta.image;
    }
  }

  render() {
    const { insights } = this;
    const { width, height, ratio } = this.state;

    return (
      <article className="metaImage">
        <h4>
          Page Social Image
          <a
            target="_blank"
            rel="noopener"
            href="https://yoast.com/advanced-technical-seo-social-image-ogimage-tags"
            title="Learn more about page social image"
          >More info <Icon src={infoSvg} /></a>
        </h4>
        {
          insights.meta.description ? (
            <figure>
              <a className="metaImageWrapper" target="prismicToolbarMetaImage" rel="noopener" href={insights.meta.image} >
                <img src={insights.meta.image} ref={this.onImageChange} />
              </a>
              <figcaption>
                <span
                  className="hint"
                  title="Social media typically displays this image using a 1:1.92 aspect ratio"
                >
                  Image Ratio: {ratio} ({width}px / {height}px)
                </span><br />{
                  DisplayHint(Protocol.openGraph, Meta.image, insights.meta.openGraph.image)
                } - {
                  DisplayHint(Protocol.twitter, Meta.image, insights.meta.twitter.image)
                }
              </figcaption>
            </figure>
          ) : DisplayEmpty(Meta.image, insights.meta.image)
        }
      </article>
    );
  }
}

const DisplayMetaDebuggers = () => (
  <article className="metaDebuggers">
    <h4>
      Official Debuggers
    </h4>
    <p>
      <a
        target="_blank"
        rel="noopener"
        href="https://developers.facebook.com/tools/debug"
        title="Facebook OpenGraph debugger"
      >Facebook</a> - <a
        target="_blank"
        rel="noopener"
        href="https://cards-dev.twitter.com/validator"
        title="Twitter debugger"
      >Twitter</a> - <a
        target="_blank"
        rel="noopener"
        href="https://www.linkedin.com/post-inspector/inspect"
        title="LinkedIn debugger"
      >LinkedIn</a> - <a
        target="_blank"
        rel="noopener"
        href="https://search.google.com/structured-data/testing-tool/u/0"
        title="Google structured data debugger"
      >Structured Data</a>
    </p>
  </article>
);
