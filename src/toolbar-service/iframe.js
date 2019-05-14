import { getState } from '@iframe/toolbarState';
import * as Prediction from '@iframe/prediction';
import * as Preview from '@iframe/preview';
import * as Analytics from '@iframe/analytics';

import { Messages } from './messages';

export function setup(portToMainWindow) {
  portToMainWindow.onmessage = async msg => {
    const { type, data } = msg.data;
    const result /* Promise<Object> */ = await (() => {
      switch (type) {
        case Messages.InitialData: return getInitialData();
        case Messages.UpdatePreview: return updatePreview();
        case Messages.ClosePreviewSession: return closePreviewSession();
        case Messages.SharePreview: return sharePreview(data);
        case Messages.TrackDocumentClick: return trackDocumentClick(data);
        case Messages.TrackToolbarSetup: return trackToolbarSetup();
        default: return new Promise(null);
      }
    })();
    this.port.postMessage({ type, data: result });
  };
}

async function getInitialData() /* Promise<{ state: Object, docs: Object[] }> */ {
  const [toolbarState, predictionDocs] = await Promise.all(
    [getState(), Prediction.getPredictionDocuments()]
  );
  return {
    state: toolbarState,
    docs: predictionDocs
  };
}

async function updatePreview() /* Promise<{ reload: boolean, ref: string }> */ {
  return Preview.getCurrentPreviewRef();
}

async function closePreviewSession() /* Promise<null> */ {
  return Preview.closePreviewSession();
}

async function sharePreview(location) {
  return sharePreview(location);
}

async function trackDocumentClick({ isMain }) {
  return Analytics.trackDocumentClick(isMain);
}

async function trackToolbarSetup() {
  return Analytics.trackToolbarSetup();
}
