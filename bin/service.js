#!/usr/bin/env node

const ServiceManager = require('glued-common').ServiceManager
const manager = new ServiceManager()
const Scanner = require('../src/scanner').Scanner

manager.load(new Scanner(), require('../package.json'))
