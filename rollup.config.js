import filesize from 'rollup-plugin-filesize';
import {terser} from 'rollup-plugin-terser';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist2/api-client.js',
    format: 'esm',
  },
  plugins: [
    // terser(), // минификатор совместимый с ES2015+, форк и наследник UglifyES,
    filesize({
      showBrotliSize: true,
    })
  ],
};
