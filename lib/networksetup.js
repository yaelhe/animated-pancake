'use strict';

const { execFile } = require('child_process');
const { exec } = require('sudo-prompt');

const scriptPath = require.resolve('../bash-scripts/active-network.sh');

const execFilePromise = file => new Promise((resolve, reject) =>
  execFile(file, (err, stdout) => err ? reject(err) : resolve(stdout))
);

const execPromise = command => new Promise((resolve, reject) =>
  exec(command, (err, stdout) => err ? reject(err) : resolve(stdout))
);

module.exports = async () => {
  const networkService = (await execFilePromise(scriptPath)).toString().trim();

  const domain = 'localhost';
  const portnumber = '7373';

  await execPromise(`networksetup setwebproxy ${networkService} ${domain} ${portnumber}`);

  return async () => {
    await execPromise(`networksetup setwebproxy ${networkService} '' ''`);
    await execPromise(`networksetup setwebproxystate ${networkService} off`);
  };
};
