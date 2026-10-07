(function () {
  'use strict';
  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  // A bounded byte protocol: numeric CSV fields use unsigned varints; runs of
  // zero use tag 0 followed by their length. No decompressor or remote storage.
  function encode(payload) {
    var parsed = namespace.catalog.unpackPayload(payload), fields = parsed.payload.split(',');
    if (fields.some(function (field) { return ! /^-?\d+(?:\.\d+)?$/.test(field) || !Number.isFinite(Number(field)) || Math.abs(Number(field)) > 0x3ffffffd; })) throw new Error('Invalid share fields');
    var bytes = [1];
    function put(value) { do { var byte = value % 128; value = Math.floor(value / 128); bytes.push(byte | (value ? 128 : 0)); } while (value); }
    put(parsed.revision); put(fields.length);
    var context = new TextEncoder().encode(JSON.stringify(parsed.context)); put(context.length);
    bytes.push.apply(bytes, context);
    for (var i = 0; i < fields.length; i++) {
      if (Number(fields[i]) === 0) {
        var run = 1; while (i + run < fields.length && Number(fields[i + run]) === 0) run++;
        put(0); put(run); i += run - 1;
      } else {
        var value = Number(fields[i]);
        if (Number.isInteger(value)) put((value < 0 ? -2 * value - 1 : 2 * value) + 2);
        else { var decimal = new TextEncoder().encode(fields[i]); if (decimal.length > 64) throw new Error('Oversized decimal'); put(1); put(decimal.length); bytes.push.apply(bytes, decimal); }
      }
    }
    return 'S1.' + btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(code) {
    if (!code.startsWith('S1.')) return code; // Existing CSV share links remain readable.
    if (!/^S1\.[A-Za-z0-9_-]{1,10000}$/.test(code)) throw new Error('Invalid share code');
    var bytes = Uint8Array.from(atob(code.slice(3).replace(/-/g, '+').replace(/_/g, '/')), function (c) { return c.charCodeAt(0); });
    var pos = 0;
    function get() {
      var value = 0, factor = 1;
      for (var n = 0; n < 5; n++) {
        if (pos >= bytes.length) throw new Error('Truncated share code');
        var byte = bytes[pos++]; value += (byte & 127) * factor;
        if (!(byte & 128)) { if (value > 0x7fffffff) throw new Error('Oversized share value'); return value; }
        factor *= 128;
      }
      throw new Error('Oversized share value');
    }
    if (bytes[pos++] !== 1) throw new Error('Unsupported share version');
    var revision = get(), count = get(), length = get();
    if (!count || count > 2000 || length > 2048 || pos + length > bytes.length || revision > 999999999) throw new Error('Oversized share data');
    var context = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.slice(pos, pos + length))); pos += length;
    var fields = [];
    while (fields.length < count) {
      var value = get();
      if (value === 1) {
        var size = get(); if (!size || size > 64 || pos + size > bytes.length) throw new Error('Invalid decimal');
        var decimal = new TextDecoder('utf-8', { fatal: true }).decode(bytes.slice(pos, pos + size)); pos += size;
        if (!/^-?\d+(?:\.\d+)?$/.test(decimal) || !Number.isFinite(Number(decimal)) || Math.abs(Number(decimal)) > 0x3ffffffd) throw new Error('Invalid decimal');
        fields.push(decimal);
      } else if (value) { value -= 2; fields.push(value % 2 ? -(value + 1) / 2 : value / 2); }
      else { var run = get(); if (!run || fields.length + run > count) throw new Error('Invalid zero run'); while (run--) fields.push(0); }
    }
    if (pos !== bytes.length) throw new Error('Trailing share data');
    // Context passes through the catalog's strict validation before calculation.
    var packed = revision || context ? 'PS3:' + revision + ':' + (context ? 'C1:' + btoa(JSON.stringify(context)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + ':' : '') + fields.join(',') : fields.join(',');
    namespace.catalog.unpackPayload(packed);
    return packed;
  }
  namespace.shareCodec = { encode: encode, decode: decode };
})();
