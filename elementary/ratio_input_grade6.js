(function (root) {
  'use strict';
  const parts = entry => entry.kind === 'mixed' ? ['whole', 'numerator', 'denominator'] : entry.kind === 'fraction' ? ['numerator', 'denominator'] : ['number'];
  function fromValue(raw = '') {
    const entry = { kind: 'fraction', number: '', whole: '', numerator: '', denominator: '' };
    const mixed = String(raw).match(/^(\d*)\s+(\d*)\/(\d*)$/);
    const fraction = String(raw).match(/^(\d*)\/(\d*)$/);
    if (mixed) { entry.kind = 'mixed'; [entry.whole, entry.numerator, entry.denominator] = mixed.slice(1); }
    else if (fraction) [entry.numerator, entry.denominator] = fraction.slice(1);
    else if (raw !== '') { entry.kind = 'number'; entry.number = String(raw); }
    return entry;
  }
  const complete = entry => parts(entry).every(part => entry[part] !== '');
  function value(entry) {
    if (parts(entry).every(part => entry[part] === '')) return '';
    if (entry.kind === 'number') return entry.number;
    const numerator = entry.numerator || '□', denominator = entry.denominator || '□';
    return entry.kind === 'mixed' ? `${entry.whole || '□'} ${numerator}/${denominator}` : `${numerator}/${denominator}`;
  }
  function visual(entry) {
    if (entry.kind === 'number') return entry.number;
    return entry.kind === 'mixed' ? `${entry.whole} ${entry.numerator}/${entry.denominator}` : `${entry.numerator}/${entry.denominator}`;
  }
  function edit(entry, part, key) {
    if (!parts(entry).includes(part)) return;
    if (key === 'delete') entry[part] = entry[part].slice(0, -1);
    else if (key === 'clear') entry[part] = '';
    else if (/^[0-9]$/.test(key) && entry[part].length < 8) entry[part] += key;
    else if (key === '.' && part === 'number' && !entry.number.includes('.') && entry.number.length < 8) entry.number += '.';
  }
  const api = { parts, fromValue, complete, value, visual, edit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RatioInput = api;
})(typeof window !== 'undefined' ? window : globalThis);
