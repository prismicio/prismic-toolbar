import { normalizeState, Messenger } from 'common';

const state = normalizeState(window.prismicState);
const { auth, guest, master, preview } = state;

const messenger = new Messenger(window.parent);

export { state, auth, guest, master, preview, messenger };
