#!/usr/bin/env node --harmony

'use strict';

const program = require('commander');
const chalk = require('chalk');
const networksetup = require('./lib/networksetup');
const startServer = require('./lib/start-server');

program
  .command('start')
  .option('-o, --override <from> <to>')
  .description('start a proxy server and listen to all outgoing http requests')
  .action(async () => {
    const args = program.rawArgs;

    const parseOptions = (acc, value, index) =>
      value === '--override' ? Object.assign(acc, { [args[index + 1]]: args[index + 2] }) : acc;

    const overrides = args.reduce(parseOptions, {});

    const [cleanupNetworksetup] = await Promise.all([
      networksetup(),
      startServer(overrides),
    ]);

    console.log(`${chalk.green('Woo-hoo! Chibi Chibi is up and running at http://localhost:7373!')}`);
    console.log();
    console.log(`To override this or other settings, check the ${chalk.cyan('~/.chibichibirc')} file`);
    console.log(`Use the ${chalk.cyan('--help')} option for a list of configuration options`);
    console.log();
    console.log('Chibi Chibi will list proxied requests bellow');
    console.log();

    process.on('SIGINT', async () => {
      await cleanupNetworksetup();
      process.exit();
    });
  });

program.parse(process.argv);
