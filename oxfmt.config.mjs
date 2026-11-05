import { defineConfig } from 'oxfmt'

// FMC default — aligned with tilda-geo (single quotes) and trassenscout (ignore/build paths).
// Copy to project root on scaffold; adjust sortTailwindcss.stylesheet and ignorePatterns (keep in sync with oxlint.config.mjs).
export default defineConfig({
  useTabs: false,
  tabWidth: 2,
  printWidth: 100,
  singleQuote: true,
  jsxSingleQuote: false,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  semi: false,
  arrowParens: 'always',
  bracketSameLine: false,
  bracketSpacing: true,
  endOfLine: 'lf',
  sortImports: {
    newlinesBetween: false,
  },
  // No sortTailwindcss: oxfmt only supports Tailwind 4, this app stays on Tailwind 3 for old
  // Android Chrome (see tailwind.config.ts).
  sortPackageJson: true,
  ignorePatterns: ['.agents/**', '.cursor/**', '.output/**', 'dist/**'],
})
