# animated-pancake

> Simple http proxy that makes it easy to intercept any request and return a custom response

## Introduction

Animated pancake is a small and simple http proxy for intercepting requests. Created to make it easier for developers to debug and test production code. It is also useful for quality engineers to check code before it's deployed. Animated pancake let's you replace requests by redirecting them to a local file or an other address on the internet.

## How to use

### Install

Install with `npm`:

```bash
npm install -g animated-pancake
```

or with `yarn`

```bash
yarn global add animated-pancake
```

### Usage

```
$ animated-pancake --help

Usage: animated-pancake [options] [command]


  Commands:

    start [options]   start a proxy server and listen to all outgoing http requests

  Options:

    -h, --help  output usage information
```
