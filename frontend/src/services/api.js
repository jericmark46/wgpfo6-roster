const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}/api${path}`, {
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    ...options,
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const error = new Error(body?.message || 'Request failed. Please try again.');
    error.status = response.status;
    throw error;
  }

  return body;
}

export function searchMembers(fields, page, limit, signal) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  Object.entries(fields).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return request(`/search?${params}`, { signal });
}

export function getRoster(hhId, signal) {
  return request(`/roster/${encodeURIComponent(hhId)}`, { signal });
}

export function getStats(signal) {
  return request('/stats', { signal });
}

export function getLocations(province, municipality, signal) {
  const params = new URLSearchParams();
  if (province) params.set('province', province);
  if (municipality) params.set('municipality', municipality);
  const query = params.toString();
  return request(`/locations${query ? `?${query}` : ''}`, { signal });
}

export function verifyPasskey(passkey, signal) {
  return request('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ passkey }),
    signal,
  });
}
