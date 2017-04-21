'use strict';

const { exec } = require('child_process');
const express = require('express');
const { expect } = require('chai');
const mockBin = require('mock-bin');
const eventually = require('wix-eventually');
const request = require('request-promise');
const tempWrite = require('temp-write');

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

const e2eServerPort = 4300;

describe('start', () => {
  let proc;
  let networksetupCleanup;
  let ifconfigCleanup;
  let networksetupInitCalled;
  let networksetupCleanCalled;
  let networksetupOffCalled;
  let serverRedirectCalled;

  before(() => {
    express()
      .get('/init', (req, res) => {
        networksetupInitCalled = true;
        res.sendStatus(200);
      })
      .get('/clean', (req, res) => {
        networksetupCleanCalled = true;
        res.sendStatus(200);
      })
      .get('/off', (req, res) => {
        networksetupOffCalled = true;
        res.sendStatus(200);
      })
      .listen(e2eServerPort);
  });

  beforeEach(() => {
    proc = null;
    networksetupCleanup = null;
    ifconfigCleanup = null;
    networksetupInitCalled = false;
    networksetupCleanCalled = false;
    networksetupOffCalled = false;
    serverRedirectCalled = false;
  });

  beforeEach(async () => {
    const domain = 'localhost';
    const portnumber = '7373';

    networksetupCleanup = await mockBin(
      'networksetup',
      'node',
      `const http = require('http');

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
  });

  afterEach(() => {
    if (proc) {
      proc.kill('SIGINT');
    }
  });

  afterEach(async () => {
    networksetupCleanup();
    ifconfigCleanup();
  });

  it('should override network settings with web proxy settings and cleanup after termination', async () => {
    proc = exec('./index.js start');

    await eventually(() => {
      expect(networksetupInitCalled).to.equal(true);
    });

    proc.kill('SIGINT');

    return eventually(() => {
      expect(networksetupCleanCalled).to.equal(true);
      expect(networksetupOffCalled).to.equal(true);
    });
  });

  it('proxy requests that do not match any overrides', async () => {
    proc = exec('./index.js start');

    await eventually(() => {
      expect(networksetupInitCalled).to.equal(true);
    });

    express()
      .use((req, res) => {
        serverRedirectCalled = true;
        res.send('');
      })
      .listen(9000);

    await request({
      url: 'http://localhost:7373',
      headers: {
        Host: 'localhost:9000'
      }
    });

    expect(serverRedirectCalled).to.eql(true);
  });

  it('should serve files that match the --override path', async () => {
    const filepath = await tempWrite('hello world', 'myfile');

    proc = exec(`./index.js start --override /hello ${filepath}`);

    await eventually(() => {
      expect(networksetupInitCalled).to.equal(true);
    });

    const response = await request('http://localhost:7373/hello');

    expect(response).to.eql('hello world');
  });
});
