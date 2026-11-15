import { BlockList, isIP } from 'node:net';

const NON_PUBLIC_IPV4_SUBNETS: [string, number][] = [
  ['0.0.0.0', 8], // "this" network, incl. unspecified 0.0.0.0
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, incl. cloud metadata endpoints
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation (TEST-NET-1)
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation (TEST-NET-2)
  ['203.0.113.0', 24], // documentation (TEST-NET-3)
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, incl. broadcast 255.255.255.255
];

const NON_PUBLIC_IPV6_SUBNETS: [string, number][] = [
  ['::', 96], // unspecified, loopback and deprecated IPv4-compatible
  ['64:ff9b::', 96], // NAT64, may translate to internal IPv4 targets
  ['64:ff9b:1::', 48], // local-use NAT64
  ['100::', 64], // discard-only
  ['2001:db8::', 32], // documentation
  ['fc00::', 7], // unique-local
  ['fe80::', 10], // link-local
  ['fec0::', 10], // deprecated site-local
  ['ff00::', 8], // multicast
];

const nonPublicAddresses = new BlockList();
for (const [network, prefix] of NON_PUBLIC_IPV4_SUBNETS) {
  nonPublicAddresses.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of NON_PUBLIC_IPV6_SUBNETS) {
  nonPublicAddresses.addSubnet(network, prefix, 'ipv6');
}

const IPV4_MAPPED_HEX = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/;

/**
 * Extracts the embedded IPv4 address from an IPv4-mapped IPv6 address
 * (`::ffff:a.b.c.d` in any textual form).
 *
 * The address is first canonicalised through the WHATWG URL parser so the
 * dotted (`::ffff:127.0.0.1`), hex (`::ffff:7f00:1`) and fully expanded forms
 * all collapse to the same hex representation before matching.
 *
 * @param ipv6 - A syntactically valid IPv6 address without brackets.
 * @returns The embedded IPv4 address, or null when `ipv6` is not IPv4-mapped.
 */
function unwrapIpv4Mapped(ipv6: string): string | null {
  let canonical: string;
  try {
    canonical = new URL(`http://[${ipv6}]/`).hostname.slice(1, -1);
  } catch {
    return null;
  }
  const match = IPV4_MAPPED_HEX.exec(canonical.toLowerCase());
  if (!match) {
    return null;
  }
  const high = parseInt(match[1], 16);
  const low = parseInt(match[2], 16);
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
}

/**
 * Whether `ip` is a publicly routable unicast address that the server may
 * contact on behalf of a client.
 *
 * Loopback, private, link-local, unique-local, unspecified, CGNAT, multicast,
 * documentation/reserved ranges and IPv4-mapped IPv6 forms of any of those are
 * all classified as non-public. Anything that is not a valid IP literal is
 * also rejected.
 *
 * @param ip - An IPv4 or IPv6 address literal (IPv6 without brackets).
 * @returns True only for a valid, publicly routable address.
 */
export function isPublicAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) {
    return !nonPublicAddresses.check(ip, 'ipv4');
  }
  if (family === 6) {
    // Zone-scoped addresses (fe80::1%eth0) are only meaningful on a local link.
    if (ip.includes('%')) {
      return false;
    }
    const mapped = unwrapIpv4Mapped(ip);
    if (mapped !== null) {
      return isPublicAddress(mapped);
    }
    return !nonPublicAddresses.check(ip, 'ipv6');
  }
  return false;
}
