export default {

  upload(sessionId, name, blob) {
    return Router.controllers.Previews.acl(sessionId).ajax().then((acl) => {

      const defer = $.Deferred();
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      const path = acl.directory + '/' + name;
      const contentDisposition = 'inline';

      form.append('key', path);
      form.append('AWSAccessKeyId', acl.key);
      form.append('acl', 'public-read');
      form.append('policy', acl.policy);
      form.append('signature', acl.signature);
      form.append('Content-Type', 'image/png');
      form.append('Cache-Control', "max-age=315360000");
      form.append('Content-Disposition', `${contentDisposition}; filename=${name}`);
      form.append('file', blob);

      xhr.upload.addEventListener('error', function(e) {
        console.error(e);
      });

      xhr.onreadystatechange = function() {
        if(xhr.readyState == 4) {
          if(xhr.status == 200 || xhr.status == 204) {
            defer.resolve(xhr.getResponseHeader('Location'));
          } else {
            defer.reject(xhr.status);
          }
        }
      };

      xhr.open('POST', acl.url, true);
      xhr.send(form);

      return defer.promise();
    });
  }
};
