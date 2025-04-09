import { convert } from '@moneko/convert';
import { ESLint } from '@moneko/eslint';

console.log('lint start');
console.time('lint end');
const eslint = new ESLint({
  fix: true,
});
const [results, formatter] = await Promise.all([eslint.lintFiles('src'), eslint.loadFormatter('stylish')]);
const [resultText] = await Promise.all([formatter.format(results), ESLint.outputFixes(results)]);

process.stdout.write(resultText);
console.timeEnd('lint end');
const common = {
  jsc: {
    parser: {
      syntax: 'typescript',
      decorators: true,
      dynamicImport: true,
    },
    target: 'esnext',
    loose: true,
    experimental: {
      emitIsolatedDts: true,
    },
  },
  minify: true,
};

Promise.all([
  convert({
    outDir: 'cjs',
    inputDir: 'src',
    options: {
      ...common,
      module: {
        type: 'commonjs',
      },
    },
  }),
  convert({
    outDir: 'esm',
    inputDir: 'src',
    options: {
      ...common,
      module: {
        type: 'es6',
      },
    },
  })
])
