export const normalizeCrmSearch = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function phoneSearchVariants(phone: string): string[] {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00213')) digits = digits.slice(2);
  const variants = [digits];
  if (/^213\d{9}$/.test(digits)) variants.push(`0${digits.slice(3)}`);
  if (/^0\d{9}$/.test(digits)) variants.push(`213${digits.slice(1)}`);
  return variants.filter(Boolean);
}

export function matchesCrmSearch(query: string, values: unknown[], phone = '') {
  const normalized = normalizeCrmSearch(query).trim();
  if (!normalized) return true;
  const variants = phoneSearchVariants(phone);
  if (/^[+\d\s().-]+$/.test(query)) {
    const digits = query.replace(/\D/g, '');
    const queries = phoneSearchVariants(digits);
    if (digits && queries.some(q => variants.some(v => v.includes(q)))) return true;
  }
  const haystack = normalizeCrmSearch([...values, phone, ...variants, ...variants.map(v => `+${v}`)].map(v => String(v ?? '')).join(' '));
  return normalized.split(/\s+/).every(token => haystack.includes(token));
}
