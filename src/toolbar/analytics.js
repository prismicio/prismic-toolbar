export class Analytics {
  constructor(messenger) {
    this.messenger = messenger;
  }

  // Track edit button document clicks
  trackDocumentClick = arg => this.messenger.post('trackDocumentClick', arg)

  // Track initial setup of toolbar
  trackToolbarSetup = () => this.messenger.post('trackToolbarSetup')
}
