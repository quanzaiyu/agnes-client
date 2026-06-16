const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`);
  }

  return data;
}

// Auth API
export const auth = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me')
};

// User API
export const user = {
  profile: () => request('/user/profile'),
  updateProfile: (data) => request('/user/profile', { method: 'PUT', body: JSON.stringify(data) }),
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(`${API_BASE}/user/avatar`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '上传失败');
    return data;
  }
};

// Points API
export const points = {
  get: () => request('/points'),
  checkinStatus: () => request('/points/checkin-status'),
  checkin: () => request('/points/checkin', { method: 'POST' }),
  history: () => request('/points/history')
};

// Text API
export const text = {
  generate: (data) => request('/text/generate', { method: 'POST', body: JSON.stringify(data) }),
  generateStream: (data) => fetch(`${API_BASE}/text/generate`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, stream: true })
  })
};

// Image API
export const image = {
  generate: (data) => request('/image/generate', { method: 'POST', body: JSON.stringify(data) })
};

// Video API
export const video = {
  generate: (data) => request('/video/generate', { method: 'POST', body: JSON.stringify(data) }),
  status: (videoId) => request(`/video/status/${videoId}`)
};

// Config API
export const config = {
  get: () => request('/config'),
  save: (data) => request('/config', { method: 'POST', body: JSON.stringify(data) })
};