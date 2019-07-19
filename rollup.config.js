import filesize from 'rollup-plugin-filesize';
import {terser} from 'rollup-plugin-terser';


// https://github.com/Polymer/lit-html/blob/master/rollup.config.js
// https://github.com/mobxjs/mobx/blob/master/scripts/build.js

export default {
  input: 'src/index.js',
  output: {
    file: 'dist2/api-client.js',
    format: 'esm',
    banner: "/** Rest-Api-Client - (c) Constantine Melnikov 2013 - 2019 - MIT Licensed */",
  },
  plugins: [
    // terser({
    //   warnings: true,
    //   module: true,
    //   mangle: {
    //     properties: {
    //       regex: /^__/,
    //     },
    //   },
    // }),
    // terser(), // минификатор совместимый с ES2015+, форк и наследник UglifyES,
    filesize({
      showBrotliSize: true,
    })
  ],
};
