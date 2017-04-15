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

  afterEach(() => {
    proc.kill('SIGINT');
  });

  const e2eServerPort = 4300;
  let networksteupCalled = false;

  before(done => {
    const app = express()
      .use((req, res) => {
        networksteupCalled = true;
        res.send('');
      })
      .listen(e2eServerPort, done);
  });

  it('should override network settings with web proxy settings', async () => {
    const domain = 'localhost';
    const portnumber = '7373';

    const networksetupCleanup = await mockBin(
      'networksetup',
      'node',
      `const fs = require('fs');
      const http = require('http');

      if (process.argv[2] === '-listnetworkserviceorder') {
        console.log(\`${networksetupOutput}\`);
      } else if (process.argv.slice(2).join(' ') === 'setwebproxy ${networkservicePort} ${domain} ${portnumber}') {
        http.get('http://localhost:${e2eServerPort}');
      }`
    );

    const ifconfigCleanup = await mockBin(
      'ifconfig',
      'node',
      `if (process.argv[2] === '${networksetupDevice}') { console.log(\`${ifconfigOutput}\`) }`
    );

    proc = exec('node ./index.js start');

    return eventually(() => {
      expect(networksteupCalled).to.equal(true);
    });
  });
});
