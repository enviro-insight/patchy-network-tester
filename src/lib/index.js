const apiBase = import.meta.env.VITE_API_URL;

function timeoutSignal(ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(t) };
}

export async function pingServer(pingTimeoutMs = 3000) {
  console.log('Pinging server at', apiBase + '/ping');
  const { signal, cancel } = timeoutSignal(pingTimeoutMs);
  try {
    const res = await fetch(apiBase + '/ping', { method: 'GET', signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || err.toString() };
  } finally {
    cancel();
  }
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
      totalBytes += ab.byteLength || 0;
    } catch (e) {
      console.error('Error during network probe:', e);
    } finally {
      cancel();
    }
  }

  console.log('calculating avgMs')
  const avgMs = ok ? totalMs / ok : Infinity;
  console.log('calculating kbps')
  const kbps = ok
    ? ((expectBytes ? expectBytes * ok : totalBytes) / (totalMs / 1000)) / 1024
    : 0;

  console.log('checking passes')
  const passes =
    ok >= minSuccesses &&
    (minThroughputKbps ? kbps >= minThroughputKbps : true);

  console.log('building result')
  const result = { passes, ok, avgMs, kbps };

  console.log('returning result')
  return result;
}

export async function saveResult(result) {
  // post to /result endpoint
  const res = await fetch(apiBase + '/result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  });
  if (!res.ok) {
    throw new Error('Failed to save result: ' + res.status);
  }
  else {
    console.log('Result saved successfully');
  }
}

// Shared watcher that keeps the freshest position
let latestPos = null;
let watchId = null;

function ensureWatcher(opts = { enableHighAccuracy: false, maximumAge: 10000 }) {
  if (watchId !== null) return;
  watchId = navigator.geolocation.watchPosition(
    pos => { latestPos = pos; },
    err => { /* optional: handle/telemetry */ },
    opts
  );
}

// Fast "get" that returns cached if fresh, else waits briefly for an update
export function getFastPosition({
  maxAgeMs = 3000,           // accept a fix up to 10s old
  waitMs = 1000,              // how long to wait for a newer fix
  highAccuracy = false
} = {}) {
  ensureWatcher({ enableHighAccuracy: highAccuracy, maximumAge: maxAgeMs });

  const freshEnough = latestPos && (Date.now() - latestPos.timestamp) <= maxAgeMs;
  if (freshEnough) return Promise.resolve(latestPos);

  return new Promise((resolve, reject) => {
    const onUpdate = (pos) => {
      if ((Date.now() - pos.timestamp) <= maxAgeMs) {
        cleanup(); resolve(pos);
      }
    };
    const cleanup = () => {
      navigator.geolocation.clearWatch(tempWatch);
      clearTimeout(t);
    };
    const tempWatch = navigator.geolocation.watchPosition(onUpdate, err => { cleanup(); reject(err); }, {
      enableHighAccuracy: highAccuracy,
      maximumAge: 0
    });
    const t = setTimeout(() => {
      cleanup();
      latestPos ? resolve(latestPos) : reject(new Error('Timed out waiting for fresh position'));
    }, waitMs);
  });
}


export function getGeoCoordinates() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('got geo position');
        resolve(position.coords)
      },
      (error) => {
        console.log('geo position error')
        reject(error)
      }
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

export async function fetchAllResults() {
  const results = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const batch = await fetchJson(`/results?limit=${limit}&offset=${offset}`);
    results.push(...batch);
    if (batch.length < limit) break; // no more results
    offset += limit;
  }

  return results;
}
