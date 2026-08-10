import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me')
};

// Goals APIs
export const goalsAPI = {
  create: (data) => api.post('/goals', data),
  getAll: () => api.get('/goals'),
  getActive: () => api.get('/goals/active'),
  getById: (id) => api.get(`/goals/${id}`),
  update: (id, data) => api.put(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`)
};

// Problems APIs
export const problemsAPI = {
  getAll: (params) => api.get('/problems', { params }),
  getById: (id) => api.get(`/problems/${id}`),
  create: (data) => api.post('/problems', data),
  update: (id, data) => api.put(`/problems/${id}`, data),
  delete: (id) => api.delete(`/problems/${id}`),
  unlockHint: (id) => api.post(`/problems/${id}/unlock-hint`)
};

// Submissions APIs
export const submissionsAPI = {
  submit: (data) => api.post('/submissions', data),
  getAll: (params) => api.get('/submissions', { params }),
  getById: (id) => api.get(`/submissions/${id}`),
  getViolators: () => api.get('/submissions/violators'),
  getAnalytics: () => api.get('/submissions/analytics')
};

// Wallet APIs
export const walletAPI = {
  getOverview: () => api.get('/wallet'),
  getHistory: () => api.get('/wallet/history')
};

// Withdrawals APIs
export const withdrawalsAPI = {
  request: (data) => api.post('/withdrawals', data),
  getAll: () => api.get('/withdrawals'),
  getAllAdmin: (params) => api.get('/withdrawals/admin/all', { params }),
  approve: (id, notes) => api.put(`/withdrawals/${id}/approve`, { notes }),
  reject: (id, notes) => api.put(`/withdrawals/${id}/reject`, { notes })
};

// Leaderboard APIs
export const leaderboardAPI = {
  getTop: (limit) => api.get('/leaderboard', { params: { limit } }),
  getBadgeMeta: () => api.get('/leaderboard/badges')
};

// Ads APIs
export const adsAPI = {
  getByCategory: (category) => api.get('/ads', { params: { category } }),
  getSponsoredChallenges: () => api.get('/ads/sponsored-challenges'),
  impression: (id) => api.post(`/ads/${id}/impression`),
  click: (id) => api.post(`/ads/${id}/click`),
  viewStart: (id) => api.post(`/ads/${id}/view-start`),
  reward: (id, viewId) => api.post(`/ads/${id}/reward`, { viewId })
};

// Platform Settings APIs
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data)
};

// Proctoring APIs — violations are recorded server-side, never trusted from the client
export const proctorAPI = {
  start: (problemId) => api.post('/proctor/start', { problemId }),
  violation: (sessionId, type, message) => api.post('/proctor/violation', { sessionId, type, message }),
  end: (sessionId) => api.post('/proctor/end', { sessionId })
};

// AI personalized learning + adaptive difficulty
export const recommendationsAPI = {
  get: () => api.get('/recommendations')
};

// Fraud engine — transparent score + reasons, admin review
export const fraudAPI = {
  getMyScore: () => api.get('/fraud/my-score'),
  getCases: (params) => api.get('/fraud/cases', { params }),
  scan: () => api.post('/fraud/scan'),
  review: (id, data) => api.put(`/fraud/cases/${id}/review`, data),
  validate: (id) => api.post(`/fraud/cases/${id}/validate`)
};

// Admin analytics + reward ledger audit
export const adminAPI = {
  getAnalytics: () => api.get('/admin/analytics'),
  getLedger: (params) => api.get('/admin/ledger', { params }),
  adjustPoints: (data) => api.post('/admin/ledger/adjust', data),
  getAds: () => api.get('/admin/ads'),
  createAd: (data) => api.post('/admin/ads', data),
  updateAd: (id, data) => api.put(`/admin/ads/${id}`, data),
  deleteAd: (id) => api.delete(`/admin/ads/${id}`)
};

export default api;
