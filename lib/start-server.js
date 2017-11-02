'use strict';

const url = require('url');
const express = require('express');
const request = require('request');
const send = require('send');
const chalk = require('chalk');

function getUrlFromRequest(req) {
  return url.format({
    protocol: req.protocol,
    host: req.get('host'),
    pathname: req.path,
    query: req.query
  });
}

function proxyMiddleware(req, res, next) {
  const proxyUrl = getUrlFromRequest(req);

  const options = {
    url: proxyUrl,
    method: req.method,
    headers: req.headers,
    body: req.body,
  };

  request(options)
    .on('error', next)
    .pipe(res);
}

function errorMiddleware(err, req, res, next) { // eslint-disable-line no-unused-vars
  res.status(500).send(`Oops, something broke:\n\n\n ${err.stack}`);
}

function proxyRequest(req, res, override) {
  return send(req, override)
    .pipe(res)
    .on('finish', () => console.log(`  proxying request ${chalk.cyan(req.originalUrl)} to ${chalk.cyan(override)}`));
}

module.exports = (overrides) => {
  const app = express()
    .use((req, res, next) => {
      const proxyUrl = getUrlFromRequest(req);
      const override = overrides[proxyUrl];

      return override ?
        proxyRequest(req, res, override) :
        next();
    })
    .use(proxyMiddleware)
    .use(errorMiddleware);

  return new Promise((resolve, reject) => {
    const server = app.listen(7373, err => err ? reject(err) : resolve(() => server.close()));
  });
};
