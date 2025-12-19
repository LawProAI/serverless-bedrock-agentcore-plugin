'use strict';

const { compileRuntime } = require('./runtime');
const { compileRuntimeEndpoint } = require('./runtimeEndpoint');
const { compileMemory } = require('./memory');
const { compileGateway } = require('./gateway');
const { compileGatewayTarget } = require('./gatewayTarget');

module.exports = {
  compileRuntime,
  compileRuntimeEndpoint,
  compileMemory,
  compileGateway,
  compileGatewayTarget,
};
