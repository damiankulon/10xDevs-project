import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/index.ts',
    '!main.ts',
  ],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@kipio/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Izolacja testów - każdy test w osobnym środowisku
  maxWorkers: '50%',
  // Zapobiega cachowaniu modułów między testami
  resetModules: true,
};

export default config;
