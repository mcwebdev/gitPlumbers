module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.dev.json'],
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    '/lib/**/*', // Ignore built files.
    '.eslintrc.js',
  ],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    quotes: ['error', 'single'],
    'import/no-unresolved': 0,
    indent: ['error', 2],
    'object-curly-spacing': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'quote-props': ['error', 'as-needed'],
    'max-len': ['error', { code: 200 }],
    'linebreak-style': 'off',
    'require-jsdoc': 'off',
    'operator-linebreak': ['error', 'after', { overrides: { '?': 'after', ':': 'after' } }],
  },
};
