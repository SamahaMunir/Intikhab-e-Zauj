import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const env = { ...process.env };
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      
      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();
      
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      if (key) {
        env[key] = value;
      }
    }
  }
  
  return env;
}

async function main() {
  const env = loadEnv();
  
  // Ensure required env vars for build
  env.NODE_ENV = 'production';
  env.PORT = env.PORT || '5175';
  env.BASE_PATH = env.BASE_PATH || '/';
  env.BACKEND_PORT = env.BACKEND_PORT || '5000';

  console.log('🔨 Building all artifacts...\n');
  console.log(`Environment:`);
  console.log(`  NODE_ENV: ${env.NODE_ENV}`);
  console.log(`  PORT: ${env.PORT}`);
  console.log(`  BASE_PATH: ${env.BASE_PATH}`);
  console.log('');

  try {
    // Build frontend
    console.log('📦 Building frontend (nikah-network)...');
    execSync('pnpm run build', {
      stdio: 'inherit',
      cwd: path.join(__dirname, 'artifacts', 'nikah-network'),
      env: env,
    });

    console.log('\n');

    // Build backend
    console.log('📦 Building backend (api-server)...');
    execSync('pnpm run build', {
      stdio: 'inherit',
      cwd: path.join(__dirname, 'artifacts', 'api-server'),
      env: env,
    });

    console.log('\n✅ All builds complete!');
    console.log('✓ Frontend: artifacts/nikah-network/dist');
    console.log('✓ Backend: artifacts/api-server/dist');
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

main();