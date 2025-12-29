import packageJson from '../../package.json';

export const APP_VERSION = packageJson.version;

export const VERSION_INFO = {
  version: APP_VERSION,
  buildDate: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development',
};

// Version history for reference
export const VERSION_HISTORY = {
  '1.0.0': 'Initial stable release with basic todo management',
  '2.01.0': 'Database connection improvements with retry logic and health monitoring',
  '2.02.0': 'Comprehensive retry logic applied to all database operations',
  '2.03.0': 'Enhanced database connection stability and error handling',
  '2.04.0': 'Fix overdue date logic - tasks due today no longer marked as overdue',
  '2.05.0': 'Excel-like editing: Click-to-edit task titles with mobile long-press support',
};

export function getVersionInfo() {
  return {
    ...VERSION_INFO,
    buildDate: process.env.BUILD_DATE || VERSION_INFO.buildDate,
  };
}