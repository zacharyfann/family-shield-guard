import { parse } from 'tldts';

export type Institution = { brand_name: string; verified_domain: string; verified_phone: string; safe_portal_url: string };
export type DomainFinding = { hostname: string; root_domain: string; claimed_brand: string | null; official_domain: string | null; status: 'official' | 'mismatch' | 'lookalike' | 'unverified'; explanation: string };
export type DomainData = { findings: DomainFinding[]; directory_available: boolean; image_status: 'not_provided' | 'reviewed' | 'unavailable'; limitations: string };

export function extractHosts(text: string): string[] {
  const normalized = text.replace(/hxxps?:\/\//gi, 'https://').replace(/\[\.\]/g, '.');
  const candidates = normalized.match(/(?:https?:\/\/|www\.)[^\s<>"'`]+|(?:[\p{L}\p{N}][\p{L}\p{N}-]*\.)+[\p{L}]{2,63}(?::\d+)?(?:\/[^\s<>"'`]*)?/gu) ?? [];
  return [...new Set(candidates.flatMap(value => {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      return [url.hostname.toLowerCase().replace(/\.$/, '')];
    } catch { return []; }
  }))].slice(0, 40);
}

function distance(a: string, b: string): number {
  if (a.length === b.length) {
    for (let i = 0; i < a.length - 1; i++) {
      if (a.slice(0, i) + a[i + 1] + a[i] + a.slice(i + 2) === b) return 1;
    }
  }
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min((next[j - 1] ?? 0) + 1, (row[j] ?? 0) + 1, (row[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length] ?? 99;
}

export function inspectDomains(text: string, institutions: Institution[], imageStatus: DomainData['image_status'] = 'not_provided', available = true): DomainData {
  const hosts = extractHosts(text);
  const claimed = institutions.filter(item => {
    const words = item.brand_name.toLowerCase().replace(/ bank$/, '');
    return new RegExp(`\\b${words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
  });
  const findings = hosts.map((hostname): DomainFinding => {
    const root = parse(hostname, { allowPrivateDomains: true }).domain ?? hostname;
    const official = institutions.find(i => hostname === i.verified_domain || hostname.endsWith(`.${i.verified_domain}`));
    const lookalike = institutions.find(i => {
      const label = i.verified_domain.split('.')[0] ?? '';
      const actual = root.split('.')[0] ?? '';
      return hostname.includes(label) || (label.length >= 4 && distance(actual, label) <= (label.length > 5 ? 2 : 1));
    });
    const target = official ?? lookalike ?? claimed[0];
    const status = official ? 'official' : lookalike ? 'lookalike' : target ? 'mismatch' : 'unverified';
    const explanation = official ? `${hostname} belongs to the listed ${official.brand_name} domain. This does not verify the sender or the request.` : target ? `${target.brand_name} uses ${target.verified_domain}, but this link goes to ${hostname}. ${status === 'lookalike' ? 'It resembles an official name but is not its domain.' : 'This is a claimed-brand versus actual-link mismatch.'}` : `${hostname} is not in the official directory. Its owner and safety have not been verified.`;
    return { hostname, root_domain: root, claimed_brand: target?.brand_name ?? null, official_domain: target?.verified_domain ?? null, status, explanation };
  });
  return { findings, directory_available: available, image_status: imageStatus, limitations: 'Links were not opened. Redirects, domain ownership, and sender identity are not verified. Screenshot text may be incomplete.' };
}
