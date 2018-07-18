import { normalizeState } from 'common';

const state = normalizeState(window.prismicState);
const { auth, guest, master, preview } = state;

export { state, auth, guest, master, preview };
