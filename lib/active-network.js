const {execFileSync, execSync} = require('child_process');

const scriptPath = require.resolve('../bash-scripts/active-network.sh');

function activeNetwork() {
  return execFileSync(scriptPath).toString().trim();
}

export default function setWebProxy() {
  const networkService = activeNetwork();
  const domain = 'localhost';
  const portnumber = '7373';
  execSync(`networksetup setwebproxy ${networkService} ${domain} ${portnumber}`);

  return function cleanup() {
    execSync(`networksetup setwebproxy ${networkService} '' ''`);
    execSync(`networksetup setwebproxystate ${networkService} off`);
  };
}
