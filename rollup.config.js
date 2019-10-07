import replace from 'rollup-plugin-re';
import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import scss from 'rollup-plugin-scss';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/main.js',
  output: {
    sourcemap: !production,
    format: 'iife',
    name: 'app',
    file: 'public/modal.js',
  },
  plugins: [
    svelte({
      dev: !production,
      // Tell the compiler to output a custom element.
      customElement: true,
    }),
    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration —
    // consult the documentation for details:
    // https://github.com/rollup/rollup-plugin-commonjs
    resolve(),
    replace({
      patterns: [
        {
          test: /document\.head\.appendChild\(style\)/,
          replace: 'find_root(node).appendChild(style)',
        },
        {
          test: /function noop\(\)/,
          replace: `function find_root(element) {
            const parent = element.parentNode;
            return parent ? (parent.head ? parent.head : find_root(parent)) : element;
          }
            function noop()`,
        },
      ],
    }),
    commonjs(),

    // Enable live reloading in development mode
    !production && livereload('public'),

    // Minify the production build (npm run build)
    production && terser(),
    scss(),
  ],
};
