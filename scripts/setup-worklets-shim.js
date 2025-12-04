#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * Postinstall script to create a shim for react-native-worklets
 *
 * NativeWind's react-native-css-interop tries to load 'react-native-worklets/plugin'
 * but the actual package is 'react-native-worklets-core'. This script creates a
 * compatibility shim to redirect the import.
 */

const fs = require('fs');
const path = require('path');

const shimDir = path.join(__dirname, '..', 'node_modules', 'react-native-worklets');
const pluginFile = path.join(shimDir, 'plugin.js');
const packageFile = path.join(shimDir, 'package.json');

try {
  // Create directory if it doesn't exist
  if (!fs.existsSync(shimDir)) {
    fs.mkdirSync(shimDir, { recursive: true });
  }

  // Create plugin.js shim
  const pluginContent = `// Shim to redirect to react-native-worklets-core/plugin
module.exports = require('react-native-worklets-core/plugin');
`;
  fs.writeFileSync(pluginFile, pluginContent);

  // Create package.json
  const packageContent = JSON.stringify({
    name: 'react-native-worklets',
    version: '1.0.0',
    main: 'plugin.js',
    description: 'Shim for react-native-worklets-core compatibility'
  }, null, 2);
  fs.writeFileSync(packageFile, packageContent);

  console.log('✅ react-native-worklets shim created successfully');
} catch (error) {
  console.error('❌ Failed to create react-native-worklets shim:', error.message);
  // Don't fail the install process
  process.exit(0);
}
