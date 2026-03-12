// CloudFront Function: URL rewrite for redremodels.com
// Handles clean URLs, directory index rewrites, and legacy path redirects
// Runtime: cloudfront-js-2.0

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // --- Clean URL redirects ---
  // Map friendly paths to actual S3 page locations
  var cleanUrls = {
    '/our-services': '/pages/desktop/our-services/index.html',
    '/our-services/': '/pages/desktop/our-services/index.html',
    '/contact-us': '/pages/desktop/contact-us/index.html',
    '/contact-us/': '/pages/desktop/contact-us/index.html',
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
