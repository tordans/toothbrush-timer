/** @type {import('knip').KnipConfig} */
const strict = process.env.KNIP_STRICT === '1'

export default {
  entry: [
    'src/main.tsx',
    'tests/**/*.ts',
    'api/tests/**/*.ts',
    'vite.config.ts',
    'vitest.config.ts',
    'tailwind.config.ts',
    'postcss.config.js',
    'oxlint.config.mjs',
    'oxfmt.config.mjs',
  ],
  ignoreDependencies: ['tailwindcss', 'autoprefixer', 'postcss', 'terser'],
  rules: {
    files: 'error',
    dependencies: 'error',
    devDependencies: 'error',
    unlisted: 'error',
    binaries: 'error',
    exports: strict ? 'error' : 'warn',
    types: strict ? 'error' : 'warn',
    enumMembers: strict ? 'error' : 'warn',
    duplicates: 'warn',
  },
}
