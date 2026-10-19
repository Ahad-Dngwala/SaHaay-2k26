const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  '@shared': path.resolve(__dirname, '../../packages/shared'),
};

config.watchFolders = [
  path.resolve(__dirname, '../../packages/shared'),
];

module.exports = config;
