module.exports = {
  '**/*.{js,jsx,ts,tsx}': ['eslint --fix --no-warn-ignored'],
  '**/*.ts?(x)': () => 'npm run check-types',
};
