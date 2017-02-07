# node-slow-caching-proxy

A [hoxy](https://github.com/greim/hoxy) based caching HTTP(s) proxy that slows down requests to
real endpoints while caching all responses.  Useful as a plug-in for scraping tools.

Basic usage:
```js
var proxy = new Proxy({});
...
proxy.start().then(proxy => ...)
...
proxy.close().then(proxy => ...)
```

# Documentation

Documentation is available [here](https://professoreugene.github.io/node-slow-caching-proxy/Proxy.html)