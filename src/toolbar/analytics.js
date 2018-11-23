export class Analytics {
  constructor(messenger) {
    this.messenger = messenger;
  }

  // Track edit button document clicks
  trackDocumentClick = arg => {
    return this.messenger.post('trackDocumentClick', arg);
  }

  // Track initial setup of toolbar
  trackToolbarSetup = () => {
    return this.messenger.post('trackToolbarSetup');
  }
}
