# node-slow-caching-proxy

A [hoxy](https://github.com/greim/hoxy) based caching HTTP(s) proxy that slows down requests to
real endpoints while caching all responses.  Useful as a plug-in for scraping tools.

Documentation for options etc., is available in the docs directory

Usage:
```js
var proxy = new Proxy({});
...
proxy.start().then(proxy => ...)
...
proxy.close().then(proxy => ...)
```



