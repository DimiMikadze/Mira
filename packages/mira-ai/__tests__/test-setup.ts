/**
 * Jest test setup file
 * This file is run before all tests
 */

// ESM-friendly access to Jest globals
import { jest } from '@jest/globals';

// Load env vars using CJS require from an ESM module
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');

const projectDir = process.cwd();
loadEnvConfig(projectDir);

// Global test utilities
global.console = {
  ...console,
  info: jest.fn(),
  error: console.error,
  warn: console.warn,
  log: console.log,
};

// Set longer timeout for integration tests
jest.setTimeout(30000);
