(function (root) {
  'use strict';
  const parts = entry => entry.kind === 'mixed' ? ['whole', 'numerator', 'denominator'] : entry.kind === 'fraction' ? ['numerator', 'denominator'] : ['number'];
  function filled(field, values, entries) {
    if (field.type === 'rational') return !!entries[field.key] && parts(entries[field.key]).every(part => entries[field.key][part] !== '');
    const value = String(values[field.key] || '').trim();
    return field.type === 'decision' ? (field.options || ['yes', 'no']).includes(value) : /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value);
  }
  function started(field, values, entries) {
    return field.type === 'rational' ? !!entries[field.key] && parts(entries[field.key]).some(part => entries[field.key][part] !== '') : String(values[field.key] || '').trim() !== '';
  }
  function classify(fields, values = {}, entries = {}, review = false) {
    const completion = fields.every(f => filled(f, values, entries)) ? 'complete' : fields.some(f => started(f, values, entries)) ? 'partial' : 'empty';
    const label = ({ complete: '已填完', partial: '部分作答', empty: '未作答' })[completion] + (review ? '・待檢查' : '');
    return { completion, review: !!review, label };
  }
  const api = { filled, classify };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PaperExamStatus = api;
})(typeof window !== 'undefined' ? window : globalThis);
