// place files you want to import through the `$lib` alias in this folder.
function timeoutSignal(ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(t) };
}

export async function probeNetwork(healthUrl, {
  attempts = 3,
  pingTimeoutMs = 800,
  minSuccesses = 2,
  expectBytes = 0,          // set if your /healthz returns a known payload size
  minThroughputKbps = 0     // e.g. 64 to enforce ~64 KB/s
} = {}) {
  let ok = 0, totalMs = 0, totalBytes = 0;

  for (let i = 0; i < attempts; i++) {
    const { signal, cancel } = timeoutSignal(pingTimeoutMs);
    const start = performance.now();
    try {
      const res = await fetch(`${healthUrl}?_=${Date.now()}-${i}`, {
        method: 'GET',
        cache: 'no-store',
        //ignore cors
        mode: 'no-cors',
        signal
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const ab = await res.arrayBuffer();
      const ms = performance.now() - start;
      ok++;
      totalMs += ms;
      totalBytes += ab.byteLength || 0;
    } catch (_) {
      // ignore; just count as a failed probe
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
  const res = await fetch('/api/result', {
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
