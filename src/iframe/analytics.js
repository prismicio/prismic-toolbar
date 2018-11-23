import { localStorage, getCookie } from 'common';

export const trackDocumentClick = async ({ isMain }) => {
  await fetch(`/toolbar/trackDocumentClick?isMain=${Boolean(isMain)}`);
  return null;
};

export const trackToolbarSetup = async () => {
  const didTrack = localStorage('toolbarSetupTracked');
  if (!getCookie('is-logged-in') || didTrack.get()) return;
  await fetch(`/toolbar/trackToolbarSetup`);
  didTrack.set(true);
  return null;
};
