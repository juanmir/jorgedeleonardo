// CloudFront Function (viewer request).
// build.mjs sustituye el mapa de redirecciones y deja el resultado en dist-infra/.
//  - www.dominio → dominio
//  - URLs antiguas de WordPress → URLs nuevas (301)
//  - /ruta/ → /ruta/index.html  (S3 no sirve índices por sí solo)
//  - /ruta  → /ruta/            (si no tiene extensión)

var REDIRECTS = /*REDIRECTS*/{};

function redirect(location) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: location },
      'cache-control': { value: 'max-age=86400' }
    }
  };
}

function handler(event) {
  var req = event.request;
  var uri = req.uri;
  var host = req.headers.host ? req.headers.host.value : '';

  if (host.indexOf('www.') === 0) {
    return redirect('https://' + host.substring(4) + uri);
  }

  var key = uri.toLowerCase();
  if (key.charAt(key.length - 1) !== '/') key += '/';
  if (Object.prototype.hasOwnProperty.call(REDIRECTS, key)) {
    return redirect(REDIRECTS[key]);
  }

  if (uri.charAt(uri.length - 1) === '/') {
    req.uri = uri + 'index.html';
  } else {
    var last = uri.substring(uri.lastIndexOf('/') + 1);
    if (last.indexOf('.') === -1) return redirect(uri + '/');
  }
  return req;
}
