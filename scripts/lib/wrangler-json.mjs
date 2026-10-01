export function parseWranglerJson(output) {
  const text = String(output).trim();
  try { return JSON.parse(text); } catch { /* D1 --file adds progress before JSON. */ }
  const start = text.lastIndexOf('\n[');
  if (start !== -1) {
    try {
      const result = JSON.parse(text.slice(start + 1));
      if (Array.isArray(result)) return result;
    } catch { /* Never echo command output or sensitive SQL in an error. */ }
  }
  throw new Error('Wrangler did not return a valid JSON result');
}
