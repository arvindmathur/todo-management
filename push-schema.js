// Simple script to push schema to production database
const { execSync } = require('child_process');

// Set the production DATABASE_URL
process.env.DATABASE_URL = 'postgresql://postgres.lkvacvuzgbssmtqidsdc:myfirstdatabase123@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres';

try {
  console.log('Pushing schema to production database...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log('Schema pushed successfully!');
} catch (error) {
  console.error('Error pushing schema:', error.message);
}