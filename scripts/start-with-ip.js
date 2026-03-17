const { spawn } = require('child_process');
const { getNetworkIP } = require('./get-network-ip');

// Get network IP
const networkIP = getNetworkIP();
const port = process.env.PORT || 3000;

console.log('\n🚀 Starting Next.js Development Server...\n');
console.log('🌐 Network Access Information:');
console.log('═══════════════════════════════════════════════════════');
console.log(`📍 Local:    http://localhost:${port}`);
console.log(`🌍 Network:  http://${networkIP}:${port}`);
console.log('═══════════════════════════════════════════════════════\n');
console.log('💡 Tip: Use the Network URL to access from other devices on the same network\n');

// Start Next.js dev server
// Use npx to be resilient on Windows PATH/env setups
// Prefer invoking the Next binary directly to avoid shell and deprecation warnings
try {
  const nextPath = require.resolve('next/dist/bin/next');
  const nextProcess = spawn(process.execPath, [nextPath, 'dev', '-H', '0.0.0.0'], {
    stdio: 'inherit',
    env: { ...process.env },
  });
  nextProcess.on('error', (error) => {
    console.error('Error starting Next.js:', error);
    process.exit(1);
  });
  nextProcess.on('exit', (code) => {
    process.exit(code);
  });
} catch (e) {
  // Fallback to npx if resolve fails
  const nextProcess = spawn('npx', ['next', 'dev', '-H', '0.0.0.0'], {
    stdio: 'inherit',
    env: { ...process.env },
  });
  nextProcess.on('error', (error) => {
    console.error('Error starting Next.js:', error);
    process.exit(1);
  });
  nextProcess.on('exit', (code) => {
    process.exit(code);
  });
}


