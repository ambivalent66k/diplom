import { useState, useEffect, useCallback } from 'react';
import { 
  tracksAPI, 
  recommendationsAPI, 
  playlistsAPI, 
  genresAPI 
} from '../services/api';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Generic API call wrapper
  const apiCall = useCallback(async (apiFunction, ...args) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await apiFunction(...args);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Произошла ошибка';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    loading,
    error,
    clearError: () => setError(''),
    apiCall,
  };
};

// Hook for tracks data
export const useTracks = () => {
  const [tracks, setTracks] = useState([]);
  const [trending, setTrending] = useState([]);
  const [myTracks, setMyTracks] = useState([]);
  const [likedTracks, setLikedTracks] = useState([]);
  const [likedTrackIds, setLikedTrackIds] = useState(new Set());
  const { loading, error, clearError, apiCall } = useApi();
  
  const loadTrending = useCallback(async () => {
    const result = await apiCall(tracksAPI.getTrending);
    if (result.success) {
      setTrending(result.data || []);
    }
    return result;
  }, [apiCall]);
  
  const loadMyTracks = useCallback(async () => {
    const result = await apiCall(tracksAPI.getMyTracks);
    if (result.success) {
      setMyTracks(result.data.results || result.data || []);
    }
    return result;
  }, [apiCall]);
  
  const loadLikedTracks = useCallback(async () => {
    const result = await apiCall(tracksAPI.getLikedTracks);
    if (result.success) {
      const tracks = result.data.results || result.data || [];
      setLikedTracks(tracks);
      setLikedTrackIds(new Set(tracks.map(track => track.id)));
    }
    return result;
  }, [apiCall]);
  
  const searchTracks = useCallback(async (query) => {
    const result = await apiCall(tracksAPI.searchTracks, query);
    if (result.success) {
      setTracks(result.data.results || result.data || []);
    }
    return result;
  }, [apiCall]);
  
  const likeTrack = useCallback(async (track) => {
    const result = await apiCall(tracksAPI.likeTrack, track.id);
    if (result.success) {
      setLikedTrackIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(track.id)) {
          newSet.delete(track.id);
        } else {
          newSet.add(track.id);
        }
        return newSet;
      });
    }
    return result;
  }, [apiCall]);
  
  return {
    tracks,
    trending,
    myTracks,
    likedTracks,
    likedTrackIds,
    loading,
    error,
    clearError,
    loadTrending,
    loadMyTracks,
    loadLikedTracks,
    searchTracks,
    likeTrack,
  };
};

// Hook for recommendations
export const useRecommendations = () => {
  const [forYou, setForYou] = useState([]);
  const [byType, setByType] = useState({});
  const [similarTracks, setSimilarTracks] = useState([]);
  const { loading, error, clearError, apiCall } = useApi();
  
  const loadForYou = useCallback(async () => {
    const result = await apiCall(recommendationsAPI.getForYou);
    if (result.success) {
      setForYou(result.data || []);
    }
    return result;
  }, [apiCall]);
  
  const loadByType = useCallback(async () => {
    const result = await apiCall(recommendationsAPI.getByType);
    if (result.success) {
      setByType(result.data || {});
    }
    return result;
  }, [apiCall]);
  
  const loadSimilarTracks = useCallback(async () => {
    const result = await apiCall(recommendationsAPI.getSimilarTracks);
    if (result.success) {
      setSimilarTracks(result.data || []);
    }
    return result;
  }, [apiCall]);
  
  const loadByGenre = useCallback(async (genreId) => {
    const result = await apiCall(recommendationsAPI.getByGenre, genreId);
    return result;
  }, [apiCall]);
  
  const refreshRecommendations = useCallback(async () => {
    const result = await apiCall(recommendationsAPI.refresh);
    if (result.success) {
      // Reload all recommendations after refresh
      await Promise.all([
        loadForYou(),
        loadByType(),
        loadSimilarTracks(),
      ]);
    }
    return result;
  }, [apiCall, loadForYou, loadByType, loadSimilarTracks]);
  
  return {
    forYou,
    byType,
    similarTracks,
    loading,
    error,
    clearError,
    loadForYou,
    loadByType,
    loadSimilarTracks,
    loadByGenre,
    refreshRecommendations,
  };
};

// Hook for playlists
export const usePlaylists = () => {
  const [playlists, setPlaylists] = useState([]);
  const [myPlaylists, setMyPlaylists] = useState([]);
  const { loading, error, clearError, apiCall } = useApi();
  
  const loadMyPlaylists = useCallback(async () => {
    const result = await apiCall(playlistsAPI.getMyPlaylists);
    if (result.success) {
      setMyPlaylists(result.data.results || result.data || []);
    }
    return result;
  }, [apiCall]);
  
  const loadAllPlaylists = useCallback(async () => {
    const result = await apiCall(playlistsAPI.getAllPlaylists);
    if (result.success) {
      setPlaylists(result.data.results || result.data || []);
    }
    return result;
  }, [apiCall]);
  
  const createPlaylist = useCallback(async (playlistData) => {
    const result = await apiCall(playlistsAPI.createPlaylist, playlistData);
    if (result.success) {
      await loadMyPlaylists(); // Reload playlists
    }
    return result;
  }, [apiCall, loadMyPlaylists]);
  
  return {
    playlists,
    myPlaylists,
    loading,
    error,
    clearError,
    loadMyPlaylists,
    loadAllPlaylists,
    createPlaylist,
  };
};

// Hook for genres
export const useGenres = () => {
  const [genres, setGenres] = useState([]);
  const { loading, error, clearError, apiCall } = useApi();
  
  const loadGenres = useCallback(async () => {
    const result = await apiCall(genresAPI.getAll);
    if (result.success) {
      setGenres(result.data.results || result.data || []);
    }
    return result;
  }, [apiCall]);
  
  useEffect(() => {
    loadGenres();
  }, [loadGenres]);
  
  return {
    genres,
    loading,
    error,
    clearError,
    loadGenres,
  };
};