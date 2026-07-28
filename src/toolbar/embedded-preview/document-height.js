import { throttle } from '@common';

const documentHeightMessageType = 'prismic:embedded-preview:document-height';

const postInterval = 100;

// A page whose height grows with the viewport (e.g. a 100vh hero above other
// content) grows again every time the editor applies the height we report. The
// signature is a height growing along with the viewport, repeatedly: content
// loading late (lazy images, fonts) does it once, a viewport-sized page forever.
const viewportDrivenGrowthRatio = 0.5;
const maxViewportDrivenGrowths = 3;

export function startDocumentHeightReporting({ parentOrigin }) {
  if (document.body) start(parentOrigin);
  else window.addEventListener('DOMContentLoaded', () => start(parentOrigin));
}

function start(parentOrigin) {
  let lastMeasure;
  let heightToPost;
  let viewportDrivenGrowths = 0;
  let isViewportDriven = false;
  setPageScrolling(false);

  const post = height =>
    window.parent.postMessage(
      { type: documentHeightMessageType, height },
      parentOrigin,
    );

  const postSoon = throttle(() => {
    if (heightToPost === undefined) return;

    post(heightToPost);
    heightToPost = undefined;
  }, postInterval);

  // Measuring on every observed change, never on a delay, is what keeps the
  // growth detection honest: the editor sets the viewport to the height we post,
  // so batching that change together with any other one makes the two
  // indistinguishable from a page that grows with its viewport.
  const measure = () => {
    if (isViewportDriven) return;

    const height = measureDocumentHeight();
    const { innerHeight: viewportHeight, innerWidth: viewportWidth } = window;
    const previous = lastMeasure;
    lastMeasure = { height, viewportHeight, viewportWidth };

    if (previous) {
      const viewportGrowth = viewportHeight - previous.viewportHeight;
      const heightGrowth = height - previous.height;
      // A width change reflows the page, which changes its height for reasons
      // that have nothing to do with the viewport height.
      const isReflow = viewportWidth !== previous.viewportWidth;
      const isViewportDrivenGrowth = !isReflow
        && viewportGrowth > 0
        && heightGrowth >= viewportGrowth * viewportDrivenGrowthRatio;

      viewportDrivenGrowths = isViewportDrivenGrowth
        ? viewportDrivenGrowths + 1
        : 0;

      if (viewportDrivenGrowths >= maxViewportDrivenGrowths) {
        isViewportDriven = true;
        setPageScrolling(true);
        heightToPost = undefined;
        post(null);
        return;
      }

      if (heightGrowth === 0) return;
    }

    heightToPost = height;
    postSoon();
  };

  const observer = new ResizeObserver(measure);
  observer.observe(document.documentElement);
  observer.observe(document.body);

  window.addEventListener('load', measure);
  if (document.fonts) document.fonts.ready.then(measure);

  measure();
}

function setPageScrolling(enabled) {
  const overflow = enabled ? '' : 'hidden';
  document.documentElement.style.overflow = overflow;
  document.body.style.overflow = overflow;
}

function measureDocumentHeight() {
  const { marginTop, marginBottom } = window.getComputedStyle(document.body);
  const margins = (parseFloat(marginTop) || 0) + (parseFloat(marginBottom) || 0);

  // `scrollHeight` is rounded and covers overflowing children, while the rect is
  // exact. Taking both and rounding up avoids a sub-pixel scrollbar.
  const height = Math.max(
    document.body.scrollHeight,
    document.body.getBoundingClientRect().height,
  );

  return Math.ceil(height + margins);
}
