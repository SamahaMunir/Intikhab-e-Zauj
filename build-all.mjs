import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔨 Building all artifacts...\n');

try {
  // Build frontend
  console.log('📦 Building frontend (nikah-network)...');
  execSync('cd artifacts/nikah-network && pnpm run build', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  
  console.log('\n');
  
  // Build backend
  console.log('📦 Building backend (api-server)...');
  execSync('cd artifacts/api-server && pnpm run build', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  
  console.log('\n✅ All builds complete!');
  console.log('✓ Frontend: artifacts/nikah-network/dist');
  console.log('✓ Backend: artifacts/api-server/dist');
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}