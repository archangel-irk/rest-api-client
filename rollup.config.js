import path from 'path';
import filesize from 'rollup-plugin-filesize';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

// https://github.com/Polymer/lit-html/blob/master/rollup.config.js
// https://github.com/mobxjs/mobx/blob/master/scripts/build.js
// https://github.com/rollup/rollupjs.org/blob/master/rollup.config.js
// https://github.com/rollup/rollup/issues/863#issuecomment-306061779
// https://github.com/rollup/rollup/blob/master/rollup.config.js
// https://github.com/rollup/rollup-starter-lib/blob/master/rollup.config.js

// banner: '/** Rest-Api-Client - (c) Constantine Melnikov 2013 - 2019 - MIT Licensed */',
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
      sourcemap: Mode.DEVELOPMENT ? 'inline' : undefined,
    },
    plugins,
  };
}

export default [
  generateBundleConfig(path.join('dist2', 'api-client.cjs.development.js'), Format.CommonJS, Mode.DEVELOPMENT),
  generateBundleConfig(path.join('dist2', 'api-client.cjs.production.min.js'), Format.CommonJS, Mode.PRODUCTION),

  generateBundleConfig(path.join('dist2', 'api-client.esm.development.js'), Format.ESModule, Mode.DEVELOPMENT),
  generateBundleConfig(path.join('dist2', 'api-client.esm.production.min.js'), Format.ESModule, Mode.PRODUCTION),

  generateBundleConfig(path.join('dist2', 'api-client.umd.development.js'), Format.UMD, Mode.DEVELOPMENT),
  generateBundleConfig(path.join('dist2', 'api-client.umd.production.min.js'), Format.UMD, Mode.PRODUCTION),
];
