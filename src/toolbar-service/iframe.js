import * as Prediction from '@iframe/prediction';
import Preview from '@iframe/preview';
import * as Analytics from '@iframe/analytics';

import { Messages } from './messages';

export function setup(portToMainWindow) {
  portToMainWindow.onmessage = async msg => {
    const { type, data } = msg.data;
    const result /* Promise<Object> */ = await (() => {
      switch (type) {
        case Messages.PreviewState: return getPreviewState();
        case Messages.PredictionDocs: return getPredictionDocs(data);
        case Messages.UpdatePreview: return updatePreview();
        case Messages.ClosePreviewSession: return closePreviewSession();
        case Messages.SharePreview: return sharePreview(data);
        case Messages.TrackDocumentClick: return trackDocumentClick(data);
        case Messages.TrackToolbarSetup: return trackToolbarSetup();
        default: return new Promise(null);
      }
    })();
    portToMainWindow.postMessage({ type, data: result });
  };
}

async function getPreviewState() /* Promise<{ Object }> */ {
  return Preview.getState();
}

async function getPredictionDocs(data) /* Promise<[Boolean, Object[]]> */ {
  return Prediction.getDocuments(data);
}

async function updatePreview() /* Promise<{ reload: boolean, ref: string }> */ {
  return Preview.getCurrentRef();
}

async function closePreviewSession() /* Promise<null> */ {
  return Preview.close();
}

async function sharePreview({ location, blob }) /* Promise<string> */ {
  return Preview.share(location, blob);
}

async function trackDocumentClick({ isMain }) /* Promise<null> */ {
  return Analytics.trackDocumentClick(isMain);
}

async function trackToolbarSetup() /* Promise<null> */ {
  return Analytics.trackToolbarSetup();
}
