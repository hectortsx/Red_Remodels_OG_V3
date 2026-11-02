// CloudFront Function: URL rewrite for redremodels.com
// Handles clean URLs, directory index rewrites, and legacy path redirects
// Runtime: cloudfront-js-2.0

function buildQueryString(querystring) {
  var queryParams = [];
  for (var key in querystring) {
    if (Object.prototype.hasOwnProperty.call(querystring, key)) {
      var parameter = querystring[key];
      var values = parameter.multiValue || [parameter];
      for (var i = 0; i < values.length; i++) {
        queryParams.push(key + '=' + values[i].value);
      }
    }
  }
  return queryParams.length ? '?' + queryParams.join('&') : '';
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var host = request.headers.host && request.headers.host.value;

  // Keep the apex domain on the canonical www host.
  if (host && host.toLowerCase() === 'redremodels.com') {
    var query = buildQueryString(request.querystring || {});
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://www.redremodels.com' + uri + query },
      },
    };
  }

  // Redirect legacy Duda pages and their directory-style variants.
  var legacyRedirects = {
    '/our-services': 'https://www.redremodels.com/#services',
    '/pages/desktop/home': 'https://www.redremodels.com/',
    '/pages/mobile/home': 'https://www.redremodels.com/',
    '/pages/tablet/home': 'https://www.redremodels.com/',
    '/pages/desktop/contact-us': 'https://www.redremodels.com/contact-us',
    '/pages/mobile/contact-us': 'https://www.redremodels.com/contact-us',
    '/pages/tablet/contact-us': 'https://www.redremodels.com/contact-us',
    '/pages/desktop/our-services': 'https://www.redremodels.com/#services',
    '/pages/mobile/our-services': 'https://www.redremodels.com/#services',
    '/pages/tablet/our-services': 'https://www.redremodels.com/#services',
  };

  var redirectDestination;
  for (var legacyPath in legacyRedirects) {
    if (Object.prototype.hasOwnProperty.call(legacyRedirects, legacyPath)
      && (uri === legacyPath || uri === legacyPath + '/' || uri === legacyPath + '/index.html')) {
      redirectDestination = legacyRedirects[legacyPath];
      break;
    }
  }

  if (redirectDestination) {
    var legacyQuery = buildQueryString(request.querystring || {});
    var hashIndex = redirectDestination.indexOf('#');
    if (legacyQuery) {
      redirectDestination = hashIndex === -1
        ? redirectDestination + legacyQuery
        : redirectDestination.substring(0, hashIndex) + legacyQuery + redirectDestination.substring(hashIndex);
    }
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: redirectDestination },
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
