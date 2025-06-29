import { BaseService } from './src/services/base.js';

console.log('Testing BaseService...');
const service = new BaseService('https://api.devnet.solana.com', 'H5sFv8VwWmjxHYS2GB4fTDsK7uTtnRT4WiixtHrET3bN', 'confirmed');

console.log('getConnection available:', typeof service.getConnection);
console.log('getCurrentSlot available:', typeof service.getCurrentSlot);

if (typeof service.getConnection === 'function') {
  console.log('✅ getConnection is accessible!');
} else {
  console.log('❌ getConnection is NOT accessible');
}

if (typeof service.getCurrentSlot === 'function') {
  console.log('✅ getCurrentSlot is accessible!');
} else {
  console.log('❌ getCurrentSlot is NOT accessible');
} 