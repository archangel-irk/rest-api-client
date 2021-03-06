/* eslint-env node */

// examples and tools
// https://open-wc.org/testing/testing-karma.html

const apiClientTestServer = require('./karma.api-client-test-server.plugin.js');

module.exports = function (config) {
  config.set({
    // list of files / patterns to load in the browser
    files: [
      'vendor/jquery-2.1.3.js',
      { pattern: 'test/**/*.test.js', type: 'module' },
    ],

    plugins: [
      // load plugin
      require.resolve('@open-wc/karma-esm'),
      // fallback: resolve any karma- plugins
      'karma-*',
      apiClientTestServer,
    ],

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: [
      'esm',
      'mocha',
      'chai',
      'api-client-test-server',
    ],

    esm: {
      // if you are using 'bare module imports' you will need this option
      nodeResolve: true,
      // set compatibility mode to all
      compatibility: 'all',
      coverage: true,
    },

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: [
      // 'Chrome',
      'ChromeHeadless',
    ],

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: [
      'progress',
      'coverage',
    ],

    preprocessors: {
      // source files, that you wanna generate coverage for
      // do not include tests or libraries
      // (these files will be instrumented by Istanbul)
      'dist/api-client.development.js': ['coverage'],
    },

    // optionally, configure the reporter
    coverageReporter: {
      type: 'html',
      // type: 'text-summary',
      dir: 'test/coverage',
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,
  });
};
