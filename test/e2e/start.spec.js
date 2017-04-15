'use strict';

const fs = require('fs');
const {exec} = require('child_process');
const mockBin = require('mock-bin');
const {expect} = require('chai');
const express = require('express');
const eventually = require('wix-eventually');

const networksetupDevice = 'en0';
const networkservicePort = 'Wi-Fi';

const networksetupOutput = `
An asterisk (*) denotes that a network service is disabled.
(1) Thunderbolt Ethernet
(Hardware Port: Thunderbolt Ethernet, Device: en4)

(2) AX88179 USB 3.0 to Gigabit Ethernet
(Hardware Port: AX88179 USB 3.0 to Gigabit Ethernet, Device: en5)

(3) Wi-Fi
(Hardware Port: ${networkservicePort}, Device: ${networksetupDevice})
`;

const ifconfigOutput = `
en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	ether 60:f8:1d:c1:97:4e
	inet6 fe80::62f8:1dff:fec1:974e%en0 prefixlen 64 scopeid 0x4
	inet 10.0.0.2 netmask 0xffffff00 broadcast 10.0.0.255
	nd6 options=1<PERFORMNUD>
	media: autoselect
	status: active`;

describe('start', () => {
  let proc;
  let networksetupCleanup;
  let ifconfigCleanup;
  let networksetupInitCalled;
  let networksetupCleanCalled;
  let networksetupOffCalled;

  beforeEach(() => {
    proc = null;
    networksetupCleanup = null;
    ifconfigCleanup = null;
    networksetupInitCalled = false;
    networksetupCleanCalled = false;
    networksetupOffCalled = false;
  });

  afterEach(() => {
    proc.kill('SIGINT');
  });

  afterEach(async () => {
    networksetupCleanup();
    ifconfigCleanup();
  });

  const e2eServerPort = 4300;

  before(done => {
    const app = express()
      .get('/init', (req, res) => {
        networksetupInitCalled = true;
        res.send('');
      })
      .get('/clean', (req, res) => {
        networksetupCleanCalled = true;
        res.send('');
      })
      .get('/off', (req, res) => {
        networksetupOffCalled = true;
        res.send('');
      })
      .listen(e2eServerPort, done);
  });

  it('should override network settings with web proxy settings and cleanup after termination', async () => {
    const domain = 'localhost';
    const portnumber = '7373';

    networksetupCleanup = await mockBin(
      'networksetup',
      'node',
      `const fs = require('fs');
      const http = require('http');

      if (process.argv[2] === '-listnetworkserviceorder') {
        console.log(\`${networksetupOutput}\`);
      } else if (process.argv.slice(2).join(' ') === 'setwebproxy ${networkservicePort} ${domain} ${portnumber}') {
        http.get('http://localhost:${e2eServerPort}/init');
      } else if (process.argv.slice(2).join(' ') === 'setwebproxy ${networkservicePort}  ') {
        http.get('http://localhost:${e2eServerPort}/clean');
      } else if (process.argv.slice(2).join(' ') === 'setwebproxystate ${networkservicePort} off') {
        http.get('http://localhost:${e2eServerPort}/off');
      }`
    );

    ifconfigCleanup = await mockBin(
      'ifconfig',
      'node',
      `if (process.argv[2] === '${networksetupDevice}') { console.log(\`${ifconfigOutput}\`) }`
    );

    proc = exec('node ./index.js start');

    await eventually(() => {
      expect(networksetupInitCalled).to.equal(true);
    });

    proc.kill('SIGINT');

    return eventually(() => {
      expect(networksetupCleanCalled).to.equal(true);
      expect(networksetupOffCalled).to.equal(true);
    });
  });
});
