'use strict';

const OFF = 0;
const ERROR = 2;
const NEVER = 'never';
const ALWAYS = 'always';

module.exports = {
  // Stop ESLint from looking for a configuration file in parent folders
  'root': true,

  parser: 'babel-eslint',

  env: {
    es6: true,
  },
  extends: [
    'airbnb-base',
    'plugin:jsdoc/recommended',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
  },

  plugins: [
    // 'no-for-of-loops',
    // 'eslint:recommended',
    // 'plugin:import/errors',
    // 'plugin:import/warnings',
    'jsdoc',
  ],

  rules: {
    // BEST_PRACTICES

    // STRICT
    // "sourceType": "module" disallows strict mode directives
    strict: [ERROR, NEVER],

    // IMPORTS
    // Ensure consistent use of file extension within the import path
    // https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/extensions.md
    'import/extensions': [ERROR, ALWAYS, {ignorePackages: true}],

    // Require modules with a single export to use a default export
    // https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/prefer-default-export.md
    'import/prefer-default-export': OFF,

    // Forbid the use of extraneous packages
    // https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/no-extraneous-dependencies.md
    // paths are treated both as absolute paths, and relative to process.cwd()
    'import/no-extraneous-dependencies': [ERROR, {
      devDependencies: [
        'test/**', // tape, common npm pattern
        'tests/**', // also common npm pattern
        'spec/**', // mocha, rspec-like pattern
        '**/__tests__/**', // jest pattern
        '**/__mocks__/**', // jest pattern
        'test.{js,jsx}', // repos with a single test file
        'test-*.{js,jsx}', // repos with multiple top-level test files
        '**/*{.,_}{test,spec}.{js,jsx}', // tests where the extension or filename suffix denotes that it is a test
        '**/jest.config.js', // jest config
        '**/jest.setup.js', // jest setup
        '**/vue.config.js', // vue-cli config
        '**/webpack.config.js', // webpack config
        '**/webpack.config.*.js', // webpack config
        '**/rollup.config.js', // rollup config
        '**/rollup.config.*.js', // rollup config
        '**/gulpfile.js', // gulp config
        '**/gulpfile.*.js', // gulp config
        '**/Gruntfile{,.js}', // grunt config
        '**/protractor.conf.js', // protractor config
        '**/protractor.conf.*.js', // protractor config

        '**/karma.*.js', // karma config and custom plugins
      ],
      optionalDependencies: false,
    }],

    // JSDOC
    // do not require jsdoc
    // https://eslint.org/docs/rules/require-jsdoc
    'require-jsdoc': OFF,

    // https://github.com/gajus/eslint-plugin-jsdoc#require-jsdoc
    'jsdoc/require-jsdoc': OFF,

    // STYLE
    // allow use of unary operators, ++ and --
    // https://eslint.org/docs/rules/no-plusplus
    'no-plusplus': OFF,
  },
};
