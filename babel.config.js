const presets = [
  [
    '@babel/env',
    {
      targets: {
        chrome: '75',
      },
      // useBuiltIns: 'usage',
    },
  ],
];

module.exports = { presets };
