import { describe, expect, it } from 'vitest';

import { isPublicAddress } from './publicAddress';

describe('isPublicAddress', () => {
  const tests: { name: string; ip: string; expected: boolean }[] = [
    { name: 'public IPv4', ip: '93.184.216.34', expected: true },
    {
      name: 'public IPv4 next to private range',
      ip: '172.32.0.1',
      expected: true,
    },
    {
      name: 'public IPv4 next to CGNAT range',
      ip: '100.128.0.1',
      expected: true,
    },
    {
      name: 'public IPv6',
      ip: '2606:2800:220:1:248:1893:25c8:1946',
      expected: true,
    },
    {
      name: 'IPv4-mapped public IPv6 (dotted)',
      ip: '::ffff:8.8.8.8',
      expected: true,
    },
    { name: 'IPv4 loopback', ip: '127.0.0.1', expected: false },
    { name: 'IPv4 loopback range', ip: '127.255.0.9', expected: false },
    { name: 'IPv4 unspecified', ip: '0.0.0.0', expected: false },
    { name: 'private 10/8', ip: '10.1.2.3', expected: false },
    {
      name: 'private 172.16/12 lower bound',
      ip: '172.16.0.1',
      expected: false,
    },
    {
      name: 'private 172.16/12 upper bound',
      ip: '172.31.255.255',
      expected: false,
    },
    { name: 'private 192.168/16', ip: '192.168.1.1', expected: false },
    {
      name: 'link-local / cloud metadata',
      ip: '169.254.169.254',
      expected: false,
    },
    { name: 'CGNAT 100.64/10', ip: '100.64.0.1', expected: false },
    { name: 'IPv4 multicast', ip: '224.0.0.1', expected: false },
    { name: 'IPv4 broadcast', ip: '255.255.255.255', expected: false },
    { name: 'IPv4 documentation', ip: '192.0.2.10', expected: false },
    { name: 'IPv6 loopback', ip: '::1', expected: false },
    { name: 'IPv6 unspecified', ip: '::', expected: false },
    { name: 'IPv6 link-local', ip: 'fe80::1', expected: false },
    {
      name: 'IPv6 zone-scoped link-local',
      ip: 'fe80::1%eth0',
      expected: false,
    },
    { name: 'IPv6 unique-local fc00::/7 (fc)', ip: 'fc00::1', expected: false },
    {
      name: 'IPv6 unique-local fc00::/7 (fd)',
      ip: 'fd12:3456::1',
      expected: false,
    },
    { name: 'IPv6 multicast', ip: 'ff02::1', expected: false },
    { name: 'NAT64 prefix', ip: '64:ff9b::7f00:1', expected: false },
    {
      name: 'IPv4-mapped loopback (dotted)',
      ip: '::ffff:127.0.0.1',
      expected: false,
    },
    {
      name: 'IPv4-mapped loopback (hex)',
      ip: '::ffff:7f00:1',
      expected: false,
    },
    {
      name: 'IPv4-mapped metadata (expanded)',
      ip: '0:0:0:0:0:ffff:a9fe:a9fe',
      expected: false,
    },
    {
      name: 'IPv4-mapped private (upper case)',
      ip: '::FFFF:10.0.0.1',
      expected: false,
    },
    { name: 'hostname, not an IP', ip: 'example.com', expected: false },
    { name: 'empty string', ip: '', expected: false },
    { name: 'malformed IPv4', ip: '256.1.1.1', expected: false },
  ];

  it.each(tests)('$name', ({ ip, expected }) => {
    expect(isPublicAddress(ip)).toBe(expected);
  });
});
