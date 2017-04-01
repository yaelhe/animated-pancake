'use strict';

const express = require('express');
const request = require('request');

function proxyMiddleware(req, res) {
  const options = {
    url: req.originalUrl,
    method: req.method,
    headers: req.headers,
    body: req.body,
  };

  console.log(req.originalUrl);

  request(options)
    .on('error', err => console.log(err))
    .pipe(res);
}

module.exports = () => {
  const server = express()
    .use(proxyMiddleware);

  return new Promise((resolve, reject) =>
    server.listen(7373, err => err ? reject(err) : resolve(() => server.close()))
  );
};
