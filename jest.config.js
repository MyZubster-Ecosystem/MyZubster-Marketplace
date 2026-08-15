module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['./jest.setup.js'],
  verbose: true,
  forceExit: true,
};
