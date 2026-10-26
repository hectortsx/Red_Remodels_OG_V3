// CloudFront Function: URL rewrite for redremodels.com
// Handles clean URLs, directory index rewrites, and legacy path redirects
// Runtime: cloudfront-js-2.0

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var host = request.headers.host && request.headers.host.value;

  // Keep the apex domain on the canonical www host.
  if (host && host.toLowerCase() === 'redremodels.com') {
    var queryParams = [];
    var querystring = request.querystring || {};
    for (var key in querystring) {
      if (Object.prototype.hasOwnProperty.call(querystring, key)) {
        var parameter = querystring[key];
        var values = parameter.multiValue || [parameter];
        for (var i = 0; i < values.length; i++) {
          queryParams.push(
            encodeURIComponent(key) + '=' + encodeURIComponent(values[i].value)
          );
        }
      }
    }

    var query = queryParams.length ? '?' + queryParams.join('&') : '';
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://www.redremodels.com' + uri + query },
      },
    };
  }

  // --- Legacy URL redirects ---
  if (uri === '/our-services' || uri === '/our-services/') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://www.redremodels.com/#services' },
      },
    };
  }

  // --- Clean URL rewrites ---
  // Map contact paths to their current S3 page locations
  var cleanUrls = {
    '/contact-us': '/contact-us/index.html',
    '/contact-us/': '/contact-us/index.html',
  };

  if (cleanUrls[uri]) {
    request.uri = cleanUrls[uri];
    return request;
  }

  // --- Directory index rewrite ---
  // If the path ends with / append index.html
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
    return request;
  }

  // If the path has no file extension, treat as directory and append /index.html
  var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
  if (lastSegment.indexOf('.') === -1) {
    request.uri = uri + '/index.html';
    return request;
  }

  return request;
}
