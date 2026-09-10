import { toolbarEvents, dispatchToolbarEvent, getLocation } from '@common';
import { reloadOrigin } from '../utils';
import screenshot from './screenshot';

export class Preview {
  constructor(client, previewCookie, previewState) {
    this.cookie = previewCookie;
    this.client = client;
    this.state = previewState;
    this.lastRefFromPush = null;

    this.end = this.end.bind(this);
    this.share = this.share.bind(this);
  }

  // Run once on page load to start or end preview
  setup = async () => {
    const preview = this.state.preview || {};
    this.active = Boolean(preview.ref);
    this.ref = preview.ref;
    this.title = preview.title;
    this.updated = preview.updated;
    this.documents = preview.documents || [];

    return {
      isActive: this.active,
      initialRef: preview.ref,
    };
  };

  watchPreviewUpdates() {
    if (this.active && !this.interval) {
      this.interval = setInterval(() => {
        // End only on a falsy ping ref (via start → end), not a missing site cookie.
        if (document.visibilityState === 'visible') this.updatePreview();
      }, 3000);
    }
  }

  cancelPreviewUpdates() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  async updatePreview() {
    if (this.isControlledByEditor()) return;
    const { reload, ref } = await this.client.updatePreview();
    // A push can take ownership while a legacy ping is still in flight.
    if (this.isControlledByEditor()) return;
    await this.start(ref);
    if (ref && reload && !this.isControlledByEditor()) this.reloadPreview(ref);
  }

  isControlledByEditor() {
    return this.cookie.isControlledByEditor && this.cookie.isControlledByEditor();
  }

  async updateFromRef(ref, reload) {
    if (ref === this.lastRefFromPush && ref === this.cookie.getRefForDomain()) return;

    const { shouldReload } = await this.start(ref);
    this.lastRefFromPush = ref;

    // reload: false: cookie already upserted; notify, never remount.
    // Missing/undefined reload keeps the legacy mismatch → location.reload() path.
    if (reload === false || shouldReload) this.reloadPreview(ref, reload);
  }

  reloadPreview(ref, reload) {
    if (dispatchToolbarEvent(toolbarEvents.previewUpdate, { ref })) {
      if (reload === false) return;
      this.cancelPreviewUpdates();
      reloadOrigin();
    }
  }

  // Start preview
  async start(ref) {
    if (!ref) {
      await this.end();
      return { displayPreview: false, shouldReload: false };
    }
    if (ref === this.cookie.getRefForDomain()) {
      return { displayPreview: true, shouldReload: false };
    }
    this.cookie.upsertPreviewForDomain(ref);
    // Force to display the preview
    return { displayPreview: false, shouldReload: true };
  }

  // End preview
  async end() {
    const controlledAtStart = this.isControlledByEditor();
    this.cancelPreviewUpdates();
    await this.client.closePreviewSession();
    // Closing the remote legacy session yields too. Do not clear a newer
    // editor ref that arrived while that close request was pending.
    if (!controlledAtStart && this.isControlledByEditor()) {
      this.watchPreviewUpdates();
      return;
    }
    this.active = false;
    this.cookie.deletePreviewForDomain();

    // Dispatch the end event and hard reload if not cancelled by handlers
    if (dispatchToolbarEvent(toolbarEvents.previewEnd)) {
      reloadOrigin();
    }
  }

  async share() {
    const screenBlob = await screenshot();
    return this.client.sharePreview(getLocation(), screenBlob);
  }
}
