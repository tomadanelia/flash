const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePaths: [
    "<rootDir>"
  ],
  moduleDirectories: [
    "node_modules"
  ],
  moduleNameMapper: {
    '^@routes/(.*)$': path.join('<rootDir>', 'src/routes/$1'),
    '^@db/(.*)$': path.join('<rootDir>', 'src/db/$1'),
    '^@handlers/(.*)$': path.join('<rootDir>', 'src/handlers/$1'),
    '^@utils/(.*)$': path.join('<rootDir>', 'src/utils/$1'),
    '^@/(.*)$': path.join('<rootDir>', 'src/$1'),
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {}],
  },
  testMatch: [
    "**/tests/**/*.test.ts",
    "**/?(*.)+(spec|test).ts"
  ],
};