import { STORAGE_KEYS } from '../utils/constants';

const API_BASE = 'http://localhost:8000/api';

// Получить токен из localStorage
const getToken = () => localStorage.getItem(STORAGE_KEYS.TOKEN);

// Базовая функция для запросов
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  console.log('🔑 Token:', token ? 'Present' : 'Missing');
  console.log('📡 Request to:', `${API_BASE}${endpoint}`);
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Token ${token}` }),
      ...options.headers,
    },
    ...options,
  };
  
  console.log('📋 Request config:', config);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    console.log('📥 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Response data:', data);
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  login: (credentials) => 
    apiRequest('/auth/token/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData) => 
    apiRequest('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  logout: () => 
    apiRequest('/auth/logout/', { method: 'POST' }),
};

// Tracks API
export const tracksAPI = {
  getTrending: () => apiRequest('/tracks/trending/'),
  
  getAllTracks: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/tracks/${queryString ? `?${queryString}` : ''}`);
  },
  
  getMyTracks: () => apiRequest('/tracks/my_tracks/'),
  
  getLikedTracks: () => apiRequest('/tracks/liked_tracks/'),
  
  searchTracks: (query) => 
    apiRequest(`/tracks/?search=${encodeURIComponent(query)}`),
  
  likeTrack: (trackId) => 
    apiRequest(`/tracks/${trackId}/like/`, { method: 'POST' }),
  
  playTrack: (trackId, data = {}) => 
    apiRequest(`/tracks/${trackId}/play/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Recommendations API
export const recommendationsAPI = {
  getForYou: () => apiRequest('/recommendations/for_you/'),
  
  getByType: () => apiRequest('/recommendations/by_type/'),
  
  getSimilarTracks: () => apiRequest('/recommendations/similar_tracks/'),
  
  getByGenre: (genreId) => 
    apiRequest(`/recommendations/by_genre/?genre_id=${genreId}`),
  
  markInteraction: (trackId, interactionType) => 
    apiRequest('/recommendations/mark_interaction/', {
      method: 'POST',
      body: JSON.stringify({
        track_id: trackId,
        interaction_type: interactionType,
      }),
    }),
  
  refresh: () => apiRequest('/recommendations-refresh/', { method: 'POST' }),
};

// Playlists API
export const playlistsAPI = {
  getMyPlaylists: () => apiRequest('/playlists/my_playlists/'),
  
  getAllPlaylists: () => apiRequest('/playlists/'),
  
  createPlaylist: (playlistData) => 
    apiRequest('/playlists/', {
      method: 'POST',
      body: JSON.stringify(playlistData),
    }),
  
  addTrackToPlaylist: (playlistId, trackId) => 
    apiRequest(`/playlists/${playlistId}/add_track/`, {
      method: 'POST',
      body: JSON.stringify({ track: trackId }),
    }),
  
  removeTrackFromPlaylist: (playlistId, trackId) => 
    apiRequest(`/playlists/${playlistId}/remove_track/`, {
      method: 'DELETE',
      body: JSON.stringify({ track: trackId }),
    }),
};

// Genres API
export const genresAPI = {
  getAll: () => apiRequest('/genres/'),
};

// Users API
export const usersAPI = {
  getMe: () => apiRequest('/users/me/'),
  
  updateMe: (userData) => 
    apiRequest('/users/update_me/', {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),
  
  followUser: (userId) => 
    apiRequest(`/users/${userId}/follow/`, { method: 'POST' }),
  
  unfollowUser: (userId) => 
    apiRequest(`/users/${userId}/unfollow/`, { method: 'POST' }),
};