import api from './api';

const roomService = {
  // Get all rooms (optionally filter by status)
  getRooms: async (status = null) => {
    const params = status ? { status } : {};
    const response = await api.get('/api/game/rooms/', { params });
    return response.data;
  },

  // Get user's rooms
  getMyRooms: async () => {
    const response = await api.get('/api/game/rooms/my/');
    return response.data;
  },

  // Get specific room details
  getRoomDetail: async (roomId) => {
    const response = await api.get(`/api/game/rooms/${roomId}/`);
    return response.data;
  },

  // Create a new room
  createRoom: async (betAmount) => {
    const response = await api.post('/api/game/rooms/create/', {
      bet_amount: betAmount,
    });
    return response.data;
  },

  // Join a room
  joinRoom: async (roomId) => {
    const response = await api.post(`/api/game/rooms/${roomId}/join/`);
    return response.data;
  },
};

export default roomService;
