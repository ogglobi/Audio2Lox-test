module.exports = {
  forbid: [
    {
      name: 'no-hidden-circulars',
      severity: 'error',
    },
    {
      name: 'no-orphans',
      severity: 'error',
    },
  ],
  options: {
    doNotFollow: 'node_modules',
    exclude: ['node_modules', 'dist'],
    maxDepth: 10,
    focus: 'src',
  },
};
