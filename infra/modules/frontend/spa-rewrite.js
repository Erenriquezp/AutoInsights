// CloudFront Function (viewer request, default behavior only): page routes such as /vehicle
// get the single-page app's index.html; files such as /assets/x.js pass through. /api/* has
// its own behavior, so API responses (404s included) are never rewritten.
function handler(event) {
  var request = event.request;
  var last = request.uri.split('/').pop();
  if (last.indexOf('.') === -1) {
    request.uri = '/index.html';
  }
  return request;
}
