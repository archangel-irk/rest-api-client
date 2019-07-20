module.exports = function (config) {
  config.set({
    // list of files / patterns to load in the browser
    files: [
      'vendor/jquery-2.1.3.js',
      'dist/api-client.umd.production.min.js',
      'test/utils.test.js',
      'test/api-client.test.js',
    ],

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: [
      'mocha',
      'chai',
    ],

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: [
      'Chrome',
      // 'ChromeHeadless',
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
      'dist/api-client.umd.production.min.js': ['coverage'],
    },

    // optionally, configure the reporter
    coverageReporter: {
      type: 'html',
      dir: 'test/coverage',
    },

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR
    // || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,
  });
};
