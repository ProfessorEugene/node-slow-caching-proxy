const expect = require('chai').expect;

const http = require('http');

const fs = require('fs');

const Proxy = require('./proxy');

const freePort = require('freeport-async');

const Stopwatch = require('tiny-tim');

const temp = require('temp');

describe('proxy.js tests', function scraperJsTests() {
    /* track temp files */
    temp.track();
    /* bump up timeout */
    this.timeout(10000);
    const hostName = '127.0.0.1';
    /* configure a scaffolding */
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write(req.url);
        res.end();
    });
    /* make a reference to a proxy instance */
    let proxy;
    /* make a reference to a proxy cache dir */
    let tmpDir;
    /* make up a requestor */
    const fetch = path => new Promise((resolve) => {
        const serverHostName = `${server.address().address}:${server.address().port}`;
        http.get({
            host: proxy.getAddress().address,
            port: proxy.getAddress().port,
            path: `http://${serverHostName}${path}`,
            headers: {
                Host: serverHostName,
            },
        }, (res) => {
            res.on('data', (body) => {
                resolve({ res, body });
            });
        });
    });

    /* start scaffolding */
    before(() => freePort.rangeAsync(2, 9000, hostName)
        .then((ports) => {
            tmpDir = temp.mkdirSync('cache');
            proxy = new Proxy({
                port: ports[1],
                hostname: hostName,
                latency: 1000,
                cachePath: tmpDir,
            });
            return Promise.all([
                new Promise((resolve, reject) => {
                    server.listen(ports[0], hostName, undefined, (err) => {
                        if (err) {
                            reject(err);
                        }
                        resolve();
                    });
                }),
                proxy.start(),
            ]);
        }));
    /* stop scaffolding */
    after(() => Promise.all([proxy.close(), new Promise((resolve, reject) => {
        server.close((err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    })]));

    describe('#proxy behavior', () => {
        it('proxies requests correctly', (done) => {
            let stopwatch = Stopwatch('ms');
            /* first request should take >= 1000 ms due to latency */
            fetch('/')
            .then((res) => {
                /* expect response to take > 1000 ms */
                expect(stopwatch()).to.be.at.least(1000);
                /* expect body to be equal to request path */
                expect(res.body.toString()).to.equal('/');
                /* reset timer */
                stopwatch = Stopwatch('ms');
                /* now fetch same path again! */
                return fetch('/');
            })
            .then((res) => {
                /* now response should take a lot quicker! */
                expect(stopwatch()).to.be.at.most(1000);
                /* expect body to equal request path */
                expect(res.body.toString()).to.equal('/');
                /* reset timer */
                stopwatch = Stopwatch('ms');
                /* now fetch different path */
                return fetch('/2');
            })
            .then((res) => {
                /* expect response to take > 1000 ms */
                expect(stopwatch()).to.be.at.least(1000);
                /* expect body to equal request path */
                expect(res.body.toString()).to.equal('/2');
            })
            .then(() => {
                /* verify that there are two files in the proxyCache */
                expect(fs.readdirSync(tmpDir)).to.have.length.of(2);
                done();
            })
            .catch(done);
        });
    });
});
