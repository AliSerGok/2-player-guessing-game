import api from './api';

const adminService = {
  // Users management
  getUsers: async (params = {}) => {
    const response = await api.get('/api/auth/admin/users/', { params });
    return response.data;
  },

  getUserDetail: async (userId) => {
    const response = await api.get(`/api/auth/admin/users/${userId}/`);
    return response.data;
  },

  updateUser: async (userId, data) => {
    const response = await api.patch(`/api/auth/admin/users/${userId}/`, data);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/api/auth/admin/users/${userId}/`);
    return response.data;
  },

  // Transactions
  getTransactions: async (params = {}) => {
    const response = await api.get('/api/auth/admin/transactions/', { params });
    return response.data;
  },

  // Rooms
  getRooms: async (params = {}) => {
    const response = await api.get('/api/game/admin/rooms/', { params });
    return response.data;
  },

  // Games
  getGames: async (params = {}) => {
    const response = await api.get('/api/game/admin/games/', { params });
    return response.data;
  },

  // Bet settings
  getBetSettings: async () => {
    const response = await api.get('/api/game/bet-settings/');
    return response.data;
  },

  updateBetSettings: async (data) => {
    const response = await api.put('/api/game/bet-settings/', data);
    return response.data;
  },
};

export default adminService;
