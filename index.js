#!/usr/bin/env node --harmony

'use strict';

const program = require('commander');
const networksetup = require('./lib/networksetup');
const startServer = require('./lib/start-server');

program
  .command('start')
  .description('start a proxy server and listen to all outgoing http requests')
  .action(async () => {
    const [cleanupNetworksetup] = await Promise.all([
      networksetup(),
      startServer(),
    ]);

    process.on('SIGINT', async () => {
      await cleanupNetworksetup();
      process.exit();
    });
  });

program.parse(process.argv);
