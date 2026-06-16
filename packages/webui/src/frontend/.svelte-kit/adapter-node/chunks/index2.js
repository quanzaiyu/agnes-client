import { w as writable } from "./index.js";
const API_BASE = "/api";
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`);
  }
  return data;
}
const auth = {
  register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me")
};
const user$1 = {
  profile: () => request("/user/profile"),
  updateProfile: (data) => request("/user/profile", { method: "PUT", body: JSON.stringify(data) }),
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await fetch(`${API_BASE}/user/avatar`, {
      method: "POST",
      credentials: "include",
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "上传失败");
    return data;
  }
};
const points = {
  get: () => request("/points"),
  checkinStatus: () => request("/points/checkin-status"),
  checkin: () => request("/points/checkin", { method: "POST" }),
  history: () => request("/points/history")
};
const text = {
  generate: (data) => request("/text/generate", { method: "POST", body: JSON.stringify(data) }),
  generateStream: (data) => fetch(`${API_BASE}/text/generate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, stream: true })
  })
};
const image = {
  generate: (data) => request("/image/generate", { method: "POST", body: JSON.stringify(data) })
};
const video = {
  generate: (data) => request("/video/generate", { method: "POST", body: JSON.stringify(data) }),
  status: (videoId) => request(`/video/status/${videoId}`)
};
const config = {
  get: () => request("/config"),
  save: (data) => request("/config", { method: "POST", body: JSON.stringify(data) })
};
const api = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  auth,
  config,
  image,
  points,
  text,
  user: user$1,
  video
}, Symbol.toStringTag, { value: "Module" }));
function createUserStore() {
  const { subscribe, set, update } = writable(null);
  return {
    subscribe,
    set,
    update,
    async fetch() {
      try {
        const { user: user2 } = await auth.me();
        set(user2);
        return user2;
      } catch {
        set(null);
        return null;
      }
    },
    logout() {
      set(null);
    },
    updatePoints(delta) {
      update((u) => u ? { ...u, points: u.points + delta } : null);
    }
  };
}
const user = createUserStore();
function createToastStore() {
  const { subscribe, update } = writable([]);
  return {
    subscribe,
    add(message, type = "info", duration = 3e3) {
      const id = Date.now() + Math.random();
      update((toasts2) => [...toasts2, { id, message, type }]);
      setTimeout(() => {
        update((toasts2) => toasts2.filter((t) => t.id !== id));
      }, duration);
    },
    success(message) {
      this.add(message, "success");
    },
    error(message) {
      this.add(message, "error", 5e3);
    },
    info(message) {
      this.add(message, "info");
    }
  };
}
const toasts = createToastStore();
function createPointsStore() {
  const { subscribe, set } = writable(0);
  return {
    subscribe,
    set,
    async fetch() {
      try {
        const { points: points2 } = await Promise.resolve().then(() => api).then((m) => m.points.get());
        set(points2);
        return points2;
      } catch {
        return 0;
      }
    }
  };
}
createPointsStore();
export {
  toasts as t,
  user as u
};
