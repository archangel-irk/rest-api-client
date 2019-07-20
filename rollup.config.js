import path from 'path';
import filesize from 'rollup-plugin-filesize';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';


// Config examples
// https://github.com/Polymer/lit-html/blob/master/rollup.config.js
// https://github.com/mobxjs/mobx/blob/master/scripts/build.js
// https://github.com/rollup/rollupjs.org/blob/master/rollup.config.js
// https://github.com/rollup/rollup/issues/863#issuecomment-306061779
// https://github.com/rollup/rollup/blob/master/rollup.config.js
// https://github.com/rollup/rollup-starter-lib/blob/master/rollup.config.js

const banner = `/**
 * Rest-Api-Client v${pkg.version}
 * https://github.com/archangel-irk/rest-api-client
 * (c) Constantine Melnikov 2013 - 2019
 * MIT License
 */`;

// Name for UMD export
const name = 'ApiClient';

const Format = {
  CommonJS: 'cjs',
  ESModule: 'esm',
  UMD: 'umd', // works as amd, cjs and iife all in one.
};

const Mode = {
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
};

function generateBundleConfig(outputFile, format, mode) {
  let plugins;
  if (mode === Mode.PRODUCTION) {
    plugins = [
      // replacePlugin({ 'process.env.NODE_ENV': JSON.stringify('production') }),
      // Минификатор совместимый с ES2015+, форк и наследник UglifyES,
      terser({
        warnings: 'verbose', // more detailed warnings
        module: format === Format.ESModule,
      }),
      filesize(),
    ];
  } else {
    plugins = [filesize()];
  }

  return {
    input: 'src/index.js',
    output: {
      file: outputFile,
      format,
      banner,
      name: format === Format.UMD ? name : undefined,
      exports: 'named',
      sourcemap: mode === Mode.DEVELOPMENT ? 'inline' : undefined,
    },
    plugins,
  };
}

export default [
  generateBundleConfig(path.join('dist', 'api-client.development.js'), Format.ESModule, Mode.DEVELOPMENT),
  generateBundleConfig(path.join('dist', 'api-client.production.min.js'), Format.ESModule, Mode.PRODUCTION),
];
