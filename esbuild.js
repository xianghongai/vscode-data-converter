const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const context = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    platform: 'node',
    format: 'cjs',
    target: 'es2022',
    // 编辑器 API 由宿主提供；其余依赖全部打包，新增依赖无需在此登记
    external: ['vscode'],
    // jsonc-parser 的 UMD 入口用变量形式 require 子模块，esbuild 静态分析不到，
    // 必须优先取各包的 ESM 入口才能完整打包
    mainFields: ['module', 'main'],
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    logLevel: 'info',
  });

  if (watch) {
    await context.watch();
    return;
  }

  await context.rebuild();
  await context.dispose();
}

main().catch((error) => {
  // 构建错误 esbuild 已按 logLevel 打印过，这里只补充配置错误一类的异常
  if (!error?.errors) {
    console.error(error);
  }

  process.exit(1);
});
