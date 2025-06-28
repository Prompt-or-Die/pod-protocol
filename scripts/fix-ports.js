#!/usr/bin/env node

/**
 * Quick Port Conflict Fixer
 * Kills processes using required ports for e2e tests
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const REQUIRED_PORTS = [3000, 8080, 3001, 5432, 6379];

async function killPortProcess(port) {
  try {
    if (process.platform === 'win32') {
      // Windows
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.split('\n').filter(line => line.includes('LISTENING'));
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') {
          await execAsync(`taskkill /PID ${pid} /F`);
          console.log(`✅ Freed port ${port} (killed PID ${pid})`);
        }
      }
    } else {
      // Unix-like systems
      await execAsync(`lsof -ti:${port} | xargs kill -9`);
      console.log(`✅ Freed port ${port}`);
    }
  } catch (error) {
    console.log(`✅ Port ${port} is already free`);
  }
}

async function main() {
  console.log('🔧 Fixing port conflicts for e2e tests...\n');
  
  for (const port of REQUIRED_PORTS) {
    await killPortProcess(port);
  }
  
  console.log('\n✅ All ports are now available for e2e tests!');
}

main().catch(console.error); 