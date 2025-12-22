import api from './api';

const authService = {
  // Register a new user
  register: async (email, password, age) => {
    const response = await api.post('/api/auth/register/', {
      email,
      password,
      password2: password,
      age,
    });

    if (response.data.tokens) {
      localStorage.setItem('access_token', response.data.tokens.access);
      localStorage.setItem('refresh_token', response.data.tokens.refresh);
    }

    return response.data;
  },

  // Login user
  login: async (email, password) => {
    const response = await api.post('/api/auth/login/', {
      email,
      password,
    });

    if (response.data.tokens) {
      localStorage.setItem('access_token', response.data.tokens.access);
      localStorage.setItem('refresh_token', response.data.tokens.refresh);
    }

    return response.data;
  },

  // Logout user
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/api/auth/logout/', {
          refresh: refreshToken,
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },

  // Get current user profile
  getProfile: async () => {
    const response = await api.get('/api/auth/profile/');
    return response.data;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },

  // Get access token
  getAccessToken: () => {
    return localStorage.getItem('access_token');
  },
};

export default authService;
