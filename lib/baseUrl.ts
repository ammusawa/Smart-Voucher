import os from 'os';
import type { NextRequest } from 'next/server';

function toIPv4(ip?: string): string | null {
  if (!ip) return null;
  // strip IPv6-mapped IPv4 ::ffff:x.x.x.x
  const match = ip.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
  return match ? match[1] : null;
}

function getLanIP(clientIpHint?: string | null): string | null {
  const interfaces = os.networkInterfaces();
  const all: Array<{ name: string; address: string }> = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // @ts-ignore - Node typings vary
      const fam = iface.family || iface?.addressFamily;
      if (iface && fam === 'IPv4' && !iface.internal && iface.address) {
        all.push({ name, address: iface.address });
      }
    }
  }
  if (all.length === 0) return null;

  // 1) If a client IP is provided, prefer same /24 subnet
  const client = toIPv4(clientIpHint || undefined);
  if (client) {
    const clientSubnet = client.split('.').slice(0, 3).join('.');
    const match = all.find(a => a.address.startsWith(clientSubnet + '.'));
    if (match) return match.address;
  }

  // 2) Prefer wireless adapters by common names
  const wifiPreferred = all.find(a => /wi-?fi|wlan|wireless/i.test(a.name));
  if (wifiPreferred) return wifiPreferred.address;

  // 3) Fallback to first non-internal IPv4
  return all[0].address;
}

export function getBaseUrlFromRequest(request: NextRequest): string {
  // Highest priority: explicit override
  if (process.env.HOST_LAN_IP) {
    const port = process.env.PORT || '3000';
    const proto = process.env.HOST_LAN_PROTO || 'http';
    return `${proto}://${process.env.HOST_LAN_IP}:${port}`;
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp = toIPv4(forwardedFor || undefined);
  const host = forwardedHost || request.headers.get('host') || 'localhost:3000';
  const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');
  const defaultProto = forwardedProto || (isLocalHost ? 'http' : 'http');

  if (isLocalHost) {
    const lan = getLanIP(clientIp);
    const [, port] = host.split(':');
    if (lan) {
      return `${defaultProto}://${lan}:${port || '3000'}`;
    }
  }

  return `${defaultProto}://${host}`;
}



