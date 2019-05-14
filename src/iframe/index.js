import { withPolyfill } from '@common/polyfill'; // Support IE 11
import ToolbarService from '@toolbar-service';

withPolyfill(() => {
  ToolbarService.setupIframe();
})();
