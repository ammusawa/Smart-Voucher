const os = require('os');

/**
 * Get the network IP address for the current machine
 * @returns {string} Network IP address or 'localhost' if not found
 */
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
  
  return null;
}

/**
 * Get the full network URL
 * @param {number} port - Port number (default: 3000)
 * @returns {string} Full URL with network IP
 */
function getNetworkURL(port = 3000) {
  const ip = getNetworkIP();
  if (ip) {
    return `http://${ip}:${port}`;
  }
  return `http://localhost:${port}`;
}

module.exports = { getNetworkIP, getNetworkURL };

