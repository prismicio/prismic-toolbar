import 'whatwg-fetch';
import coookies from './coookies';

const icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2hpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYxIDY0LjE0MDk0OSwgMjAxMC8xMi8wNy0xMDo1NzowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpERjQ5QUU2RjNEMjA2ODExODhDNkNCNjMxRDc2RjgxMiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpDNEVBRjk1MDJGRjIxMUUyOEMwOTk5MjNGNzE3MTFBNCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpDNEVBRjk0RjJGRjIxMUUyOEMwOTk5MjNGNzE3MTFBNCIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1LjEgTWFjaW50b3NoIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MTQ5NzEzQkEyNzIwNjgxMThGNjJCODhCQkREMUY0RkYiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6REY0OUFFNkYzRDIwNjgxMTg4QzZDQjYzMUQ3NkY4MTIiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5adgfzAAABo0lEQVR42uybz2YDURSHb/8oXfUBSrddlW7zBqWrvkEppWQbSrahDF2FMISsssq2tFSqpEofoJRW32C6LCG053Avd3VNJneRc87vx0fInTHfmTh3bsx1Tl+OiQHxTfwRFTElCv+d2uwQpZdOUfqxqrJHvNaQD8w0FWFZ+cDQsjyzII62hMvfE62Gx29avfMxH5blmV+JBehlkmfmUuf7SaYCfErtAdy8xxkKcCO5EXIRRivI8zR4KKXhnSfGlA0LcCtB/i264MvE2P6S8lP/CxIjH2gnjilqyj8TuxLlA50Vpkjx8nWK0NUuH+gmztXRLh/oJc7ZjhqeSvlAkTj3mXb5QF/qqi6HfPxfn1n5wGjdH3Byr+dFTnWQhzzkIQ95yEMe8pCHPOQhD3nIQx7ykIc85CEPechDfn1yZ1meL3BuVZ5zalmeM7Asz3m3LH9gWZ5zZVmeM7Ysz29VVFblOS3L8pxry/KcmWu232aiQZ4XPwtXf5cVv5h44hTtvEw9/lb+Ll8Q+05htn0B4rwQT8Sj/6w6G76JfREPXvzHGcq/AAMAq1GE9ggQGt8AAAAASUVORK5CYII=';

function setup(endpoint) {
  const previewToken = coookies.getPreviewToken();
  const experimentToken = coookies.getExperimentToken();
  const matches = endpoint.match(new RegExp('(https?://([^/]*))'));
  if (!matches) return;
  const baseURL = matches[1].replace(/\.cdn\.prismic\.io/, '.prismic.io');
  const target = matches[2].replace(/\.cdn\.prismic\.io/, '.prismic.io');

  fetch(`${baseURL}/app/authenticated/v2`, {
    credentials: 'include',
  }).then((response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.indexOf('application/json') !== -1) {
      response.json().then((json) => {
        if (json.userId) {
          document.querySelectorAll('.wio-link').forEach((el) => {
            el.parentNode.removeChild(el);
          });

          document.querySelectorAll('[data-wio-id]').forEach((el) => {
            const documentId = el.dataset.wioId;
            const url = (() => {
              if (previewToken) {
                return `${baseURL}/app/documents/${documentId}/preview/${encodeURIComponent(previewToken)}`;
              } else if (experimentToken) {
                const value = experimentToken.split(' ');
                const experimentId = value[0];
                const variationId = value[1];
                return `${baseURL}/app/documents/${documentId}/experiments/${encodeURIComponent(experimentId)}/variations/${encodeURIComponent(variationId)}`;
              }
              return `${baseURL}/app/documents/${documentId}/ref`;
            })();

            const button = (() => {
              const btn = document.createElement('a');
              btn.className = 'wio-link';
              btn.setAttribute('target', target);
              btn.setAttribute('href', url);

              const img = document.createElement('img');
              img.setAttribute('style', 'width: 16px; background: none;');
              img.setAttribute('src', icon);

              btn.appendChild(img);
              return btn;
            })();

            el.insertBefore(button, el.firstChild);
          });
        }
      });
    }
  }).catch(() => {});
}

export default {
  setup,
};
