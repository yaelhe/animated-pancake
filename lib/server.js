const express = require('express');
const request = require('request');
const forEach = require('lodash/foreach');

function proxyMiddleware(req, res, next) {
  const options = {
    url: req.originalUrl,
    method: req.method,
    headers: req.headers,
    body: req.body
  };

  console.log(req.originalUrl);

  request(options)
    .on('error', err => console.log(err))
    .pipe(res);
}

export default function () {
  const server = express()
    .use(proxyMiddleware);

  server.listen(7373);

  return () => server.close();
}
