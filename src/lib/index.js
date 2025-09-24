const apiBase = import.meta.env.VITE_API_URL;

function timeoutSignal(ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(t) };
}

export async function probeNetwork(healthUrl, {
  attempts = 3,
  pingTimeoutMs = 3000,
  minSuccesses = 2,
  expectBytes = 0,          // set if your /healthz returns a known payload size
  minThroughputKbps = 0     // e.g. 64 to enforce ~64 KB/s
} = {}) {
  let ok = 0, totalMs = 0, totalBytes = 0;

  for (let i = 0; i < attempts; i++) {
    const { signal, cancel } = timeoutSignal(pingTimeoutMs);
    const start = performance.now();
    try {
      console.log(`Probing ${apiBase}${healthUrl} (attempt ${i + 1}/${attempts})`);
      const res = await fetch(`${apiBase}${healthUrl}`, {
        method: 'GET',
        signal
      });
      if (!res.ok) throw new Error('HTTP ' + res.message);
      const ab = await res.arrayBuffer();
      const ms = performance.now() - start;
      ok++;
      totalMs += ms;
      console.log('got', ab.byteLength, 'bytes in', Math.round(ms), 'ms');
      totalBytes += ab.byteLength || 0;
    } catch (e) {
      console.error('Error during network probe:', e);
    } finally {
      cancel();
    }
  }

  const avgMs = ok ? totalMs / ok : Infinity;
  const kbps = ok
    ? ((expectBytes ? expectBytes * ok : totalBytes) / (totalMs / 1000)) / 1024
    : 0;

  const passes =
    ok >= minSuccesses &&
    (minThroughputKbps ? kbps >= minThroughputKbps : true);

  const result = { passes, ok, avgMs, kbps };

  return result;
}

export async function saveResult(result) {
  // post to /result endpoint
  const res = await fetch(apiBase + '/api/result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  });
  if (!res.ok) {
    console.warn('Failed to save result:', res.statusText);
  }
  else {
    console.log('Result saved successfully');
  }
}


export function getGeoCoordinates() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (error) => reject(error)
    );
  });
}

export async function fetchJson(url) {
  const res = await fetch(apiBase + url);
  if (!res.ok) {
    throw new Error('Failed to fetch JSON');
  }
  return res.json();
}
