import { convert } from '@moneko/convert';
import { ESLint } from 'eslint';

console.log('lint start');
console.time('lint end');
const eslint = new ESLint({
  fix: true,
});
const results = await eslint.lintFiles('src');
const formatter = await eslint.loadFormatter('stylish');
const resultText = await formatter.format(results);

process.stdout.write(resultText);
await ESLint.outputFixes(results);

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
    minify: {
      mangle: true,
      compress: true,
      format: {
        comments: 'some'
      },
    },
    experimental: {
      emitIsolatedDts: true,
    },
  },
  minify: true,
};

convert({
  outDir: 'lib',
  inputDir: 'src',
  ignore: [/\.cts$/],
  extensions: ['.mts', '.ts', '.js', '.mjs'],
  options: {
    ...common,
    module: {
      type: 'commonjs',
    },
  },
}).then((result) => {
  result.failed.map((msg) => process.stdout.write(msg));
});
