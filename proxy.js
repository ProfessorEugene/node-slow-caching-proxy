const hoxy = require('hoxy');
const fs = require('fs');

/**
 * A simple caching HTTP proxy that caches all responses based on complete URL (with query params)
 * and throttles any requests to real endpoints by introducing a synthetic per-request delay.
 */
/* eslint class-methods-use-this: "off" */
class Proxy {
    /**
     * Construct a proxy with supplied options
     * @param {object} [options]                        options
     * @param {number} [options.latency=1000]           ms to delay *real* (non-cached) requests by
     * @param {string} [options.cachePath='./cache']    file system path to cache directory
     * @param {number} [options.port=9090]              port to listen on
     * @param {string} [options.hostname='localhost']   host name to listen on (dictates interface)
     * @param {object} [options.hoxyOptions={}]         options to pass to hoxy proxy
     * @returns {Proxy} proxy
     */
    constructor(options) {
        this.options = Object.assign({
            latency: 1000,
            cachePath: './cache',
            port: 9090,
            hostname: 'localhost',
            hoxyOptions: {},
        }, options);
        this.proxy = hoxy.createServer(this.options.hoxyOptions);
        this.proxy.intercept('request', (req, res) => this.interceptRequest(req, res));
        this.proxy.intercept({ phase: 'response', as: 'buffer' },
            (req, res) => this.interceptResponse(req, res));
    }

    /**
     * Given a hoxy request, return a cache key
     * @param {Request} hoxy request
     * @returns {string} cache key
     */
    getCacheKey(req) {
        const reqKey = [req.hostname, ':', req.port, req.url].join('');
        return `${this.options.cachePath}/${encodeURIComponent(reqKey)}`;
    }

    /**
     * Returns true if key exists in cache
     * @param {string} key cache key
     * @returns {boolean} true if key exists in cache
     */
    existsInCache(key) {
        return fs.existsSync(key);
    }

    /**
     * Gets cache value for a key, if present
     * @param {string} key cache key
     * @returns {Buffer} cache value
     */
    getCacheValue(key) {
        return fs.readFileSync(key);
    }

    /**
     * Sets cache value for a key
     * @param {string} key cache key
     * @param {Buffer} value cache value to set
     */
    setCacheValue(key, value) {
        fs.writeFileSync(key, value);
    }

    /**
     * Intercepts a request and either immediately returns a cached response or slows down request
     * processing and fetches real response from destination.
     * @param {Request} req hoxy request
     * @param {Response} res hoxy response
     */
    interceptRequest(req, res) {
        const key = this.getCacheKey(req);
        if (this.existsInCache(key)) {
            Object.assign(res, { buffer: this.getCacheValue(key) });
        } else {
            req.slow({ latency: this.options.latency });
        }
    }

    /**
     * Intercepts a response and puts response value into cache if it is not already present
     * @param {Request} req hoxy request
     * @param {Response} res hoxy response
     */
    interceptResponse(req, res) {
        const key = this.getCacheKey(req);
        if (!this.existsInCache(key)) {
            this.setCacheValue(key, res.buffer);
        }
    }

    /**
     * Get proxy address
     * @return {Address} proxy address
     */
    getAddress() {
        return this.proxy._server.address();
    }

    /**
     * Return a promise that starts this proxy and resolves with this proxy instance when done
     * @returns {Promise<Proxy,Error>} promise that resolves to this when proxy is started
     */
    start() {
        return this.toPromise(cb => this.proxy.listen(
            this.options.port, this.options.hostname, undefined, cb));
    }
    /**
     * Return a promise that stops this proxy and resolves with this proxy instance when done
     * @returns {Promise<Proxy,Errror>} promise that resolves to this proxy when proxy is stopped
     */
    close() {
        return this.toPromise(cb => this.proxy.close(cb));
    }

    /**
     * Given a callback that accepts an optional error, return a promise that resolves to this
     * or rejects with error sent to callback
     * @param {function} fn a callback function that accepts an optional error
     * @return {Promise<Proxy,Error>}
     */
    toPromise(fn) {
        return new Promise((resolve, reject) => {
            fn((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }
}
module.exports = Proxy;

