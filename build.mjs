import { swcDir } from '@swc/cli';

const swcOptions = {
  jsc: {
    parser: {
      syntax: 'typescript',
      tsx: false,
      decorators: false,
    },
    target: 'es5',
    loose: true,
    minify: {
      compress: {
        dead_code: true,
        unused: true,
        collapse_vars: true,
      },
      mangle: {
        toplevel: false,
      },
    },
    experimental: {
      emitIsolatedDts: true,
    },
  },
  module: {
    type: 'commonjs',
    strict: true,
    noInterop: false,
  },
  minify: true,
  isModule: true,
};
const callbacks = {
  onSuccess(e) {
    const list = [
      '✨ 编译成功！🎉',
      `⏱️  总耗时：${e.duration.toFixed(2)}ms`,
      e.compiled && `📄 编译文件：${e.compiled}个`,
      e.copied && `📋 复制文件：${e.copied}个`,
    ]
      .filter(Boolean)
      .join('\n-  ');

    console.log(list);
  },
};

swcDir({
  cliOptions: {
    outDir: './lib',
    filenames: ['./src'],
    extensions: ['.ts'],
    stripLeadingPaths: true,
  },
  swcOptions,
  callbacks,
});
