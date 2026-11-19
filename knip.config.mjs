/** @type {import('knip').KnipConfig} */
const strict = process.env.KNIP_STRICT === '1'

export default {
  // sound-lab.ts is the dev-only listening page (sound-lab.html)
  entry: ['tests/**/*.ts', 'api/tests/**/*.ts', 'src/features/timer/sound-lab.ts'],
  // sw.js is registered at runtime; the test docroot asset only exists for the routing tests
  ignore: ['public/sw.js', 'api/tests/docroot/**'],
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
