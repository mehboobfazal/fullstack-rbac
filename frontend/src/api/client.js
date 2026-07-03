const TOKEN_KEY = "token";
const ROLE_KEY = "role";
const USER_ID_KEY = "user_id";
const API_BASE = "/api/v1";

function token() {
    return localStorage.getItem(TOKEN_KEY);
}

function parseJWT(t) {
    try {
        return JSON.parse(atob(t.split(".")[1]));
    } catch {
        return {};
    }
}

function saveToken(t) {
    localStorage.setItem(TOKEN_KEY, t);
}

async function request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...options.headers };
    const t = token();
    if (t) headers["Authorization"] = `Bearer ${t}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
        if (t) window.location.href = "/login";
        throw new Error("Unauthorized");
    }
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${res.status})`);
    }
    if (res.status === 204) return null;
    return res.json();
}

export async function login(email, password) {
    const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    saveToken(data.access_token);
    const payload = parseJWT(data.access_token);
    localStorage.setItem(ROLE_KEY, payload.role || "reviewer");
    localStorage.setItem(USER_ID_KEY, payload.sub);
    return payload;
}

export function createUser(name, email, password) {
    return request("/admin/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
    });
}

export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_ID_KEY);
}

export function getUserId() {
    return localStorage.getItem(USER_ID_KEY);
}

export function isAuthenticated() {
    return !!token();
}

export function getUserRole() {
    return localStorage.getItem(ROLE_KEY) || "reviewer";
}

export function isAdmin() {
    return getUserRole() === "admin";
}

export function listCandidates(params = {}) {
    const q = new URLSearchParams();
    if (params.offset != null) q.set("offset", params.offset);
    if (params.limit != null) q.set("limit", params.limit);
    if (params.status) q.set("status", params.status);
    if (params.role_applied) q.set("role_applied", params.role_applied);
    if (params.skill) q.set("skill", params.skill);
    if (params.keyword) q.set("keyword", params.keyword);
    return request(`/candidates?${q}`);
}

export function getCandidate(id) {
    return request(`/candidates/${id}`);
}

export function createCandidate(data) {
    return request("/candidates", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function updateCandidate(id, data) {
    return request(`/candidates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export function deleteCandidate(id) {
    return request(`/candidates/${id}`, { method: "DELETE" });
}

export function addScore(candidateId, data) {
    return request(`/candidates/${candidateId}/scores`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function listScores(candidateId) {
    return request(`/candidates/${candidateId}/scores`);
}

export function triggerSummary(candidateId) {
    return request(`/candidates/${candidateId}/summary`, { method: "POST" });
}

export function connectScoreStream(candidateId, onScores) {
    const t = token();
    const url = `${API_BASE}/candidates/${candidateId}/stream`;
    const controller = new AbortController();

    (async () => {
        try {
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${t}` },
                signal: controller.signal,
            });
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split("\n\n");
                buffer = parts.pop();
                for (const part of parts) {
                    if (part.startsWith("event: scores")) {
                        const lines = part.split("\n");
                        const dataLine = lines.find((l) => l.startsWith("data: "));
                        if (dataLine) {
                            try {
                                onScores(JSON.parse(dataLine.slice(6)));
                            } catch { /* ignore */ }
                        }
                    }
                }
            }
        } catch { /* connection closed */ }
    })();

    return controller;
}
