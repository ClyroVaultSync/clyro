import { describe, it, expect } from 'vitest';
import { extractDomain, siteOf, domainMatches } from './domains';

describe('extractDomain', () => {
  it('reads the hostname from a full URL or a bare host, without www.', () => {
    expect(extractDomain('https://www.Example.com/login?x=1')).toBe('example.com');
    expect(extractDomain('example.com/login')).toBe('example.com');
    expect(extractDomain('')).toBe('');
  });
});

describe('siteOf', () => {
  it('reduces a hostname to its registrable domain', () => {
    expect(siteOf('accounts.steelseries.com')).toBe('steelseries.com');
    expect(siteOf('https://signin.aws.amazon.com/')).toBe('amazon.com');
    expect(siteOf('www.amazon.co.uk')).toBe('amazon.co.uk');
  });

  it('treats private suffixes such as github.io as a boundary', () => {
    expect(siteOf('alice.github.io')).toBe('alice.github.io');
    expect(siteOf('docs.alice.github.io')).toBe('alice.github.io');
  });

  it('keeps hosts without a registrable domain as they are', () => {
    expect(siteOf('http://192.168.1.1')).toBe('192.168.1.1');
    expect(siteOf('localhost')).toBe('localhost');
  });
});

describe('domainMatches', () => {
  it('matches a login saved for a site on its subdomains, and the other way round', () => {
    expect(domainMatches('steelseries.com', 'accounts.steelseries.com')).toBe(true);
    expect(domainMatches('https://accounts.steelseries.com/login', 'steelseries.com')).toBe(true);
    expect(domainMatches('https://www.example.com/login', 'example.com')).toBe(true);
  });

  it('never matches a different site', () => {
    expect(domainMatches('amazon.co.uk', 'evil.co.uk')).toBe(false);
    expect(domainMatches('alice.github.io', 'bob.github.io')).toBe(false);
    expect(domainMatches('example.com', 'example.com.evil.net')).toBe(false);
    expect(domainMatches('http://192.168.1.1', '192.168.1.2')).toBe(false);
  });

  it('never matches an item with no website address', () => {
    expect(domainMatches('', 'example.com')).toBe(false);
    expect(domainMatches('', '')).toBe(false);
  });
});
