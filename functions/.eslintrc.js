module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [

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

  },
};
