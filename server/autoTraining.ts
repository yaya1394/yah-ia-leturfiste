import { runBackfill } from './scraper';

async function startAutoTraining() {
  console.log('Starting real PMU archive collection from 2018-01-01...');
  await runBackfill('2018-01-01');
  console.log('Auto-Training data collection completed.');
}

startAutoTraining().catch(err => {
  console.error('Error during Auto-Training:', err);
  process.exit(1);
});
