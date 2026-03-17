const os = require('os');

function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

const networkIP = getNetworkIP();
console.log('\n🌐 Network Access Information:');
console.log('═══════════════════════════════════════════════════════');
console.log(`📍 Local:    http://localhost:3000`);
console.log(`🌍 Network:  http://${networkIP}:3000`);
console.log('═══════════════════════════════════════════════════════\n');

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getNetworkIP };
}

