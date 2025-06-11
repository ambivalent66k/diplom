// hooks/usePlayer.js
import { useState, useCallback, useEffect } from 'react';
import { tracksAPI } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';

export const usePlayer = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  
  // Load player state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEYS.PLAYER_STATE);
    if (savedState) {
      try {
        const { track, queue: savedQueue, index } = JSON.parse(savedState);
        if (track) {
          setCurrentTrack(track);
          setQueue(savedQueue || []);
          setCurrentIndex(index || 0);
        }
      } catch (err) {
        console.error('Failed to load player state:', err);
      }
    }
  }, []);
  
  // Save player state to localStorage
  const savePlayerState = useCallback((track, newQueue, index) => {
    const state = {
      track,
      queue: newQueue,
      index,
    };
    localStorage.setItem(STORAGE_KEYS.PLAYER_STATE, JSON.stringify(state));
  }, []);
  
  const playTrack = useCallback(async (track, newQueue = []) => {
    try {
      // Register play interaction with API (will be handled by Player component as well)
      await tracksAPI.playTrack(track.id, {
        started_at: new Date().toISOString()
      });
      
      setCurrentTrack(track);
      setIsPlaying(true);
      
      if (newQueue.length > 0) {
        setQueue(newQueue);
        const trackIndex = newQueue.findIndex(t => t.id === track.id);
        setCurrentIndex(trackIndex >= 0 ? trackIndex : 0);
        savePlayerState(track, newQueue, trackIndex >= 0 ? trackIndex : 0);
      } else {
        savePlayerState(track, queue, currentIndex);
      }
    } catch (error) {
      console.error('Error playing track:', error);
    }
  }, [queue, currentIndex, savePlayerState]);
  
  const pauseTrack = useCallback(() => {
    setIsPlaying(false);
  }, []);
  
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);
  
  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;
    
    let nextIndex;
    
    if (shuffle) {
      // Random next track (excluding current)
      const availableIndices = queue.map((_, index) => index).filter(index => index !== currentIndex);
      if (availableIndices.length === 0) return;
      nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    } else {
      // Sequential next track
      nextIndex = currentIndex + 1;
      
      if (nextIndex >= queue.length) {
        if (repeat) {
          nextIndex = 0; // Loop back to start
        } else {
          return; // No next track
        }
      }
    }
    
    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      setCurrentTrack(nextTrack);
      setCurrentIndex(nextIndex);
      setIsPlaying(true);
      savePlayerState(nextTrack, queue, nextIndex);
      
      // Register play
      tracksAPI.playTrack(nextTrack.id, {
        started_at: new Date().toISOString(),
        previous_track: currentTrack?.id
      }).catch(console.error);
    }
  }, [queue, currentIndex, shuffle, repeat, savePlayerState, currentTrack]);
  
  const previousTrack = useCallback(() => {
    if (queue.length === 0) return;
    
    let prevIndex;
    
    if (shuffle) {
      // Random previous track (excluding current)
      const availableIndices = queue.map((_, index) => index).filter(index => index !== currentIndex);
      if (availableIndices.length === 0) return;
      prevIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    } else {
      // Sequential previous track
      prevIndex = currentIndex - 1;
      
      if (prevIndex < 0) {
        if (repeat) {
          prevIndex = queue.length - 1; // Loop to end
        } else {
          return; // No previous track
        }
      }
    }
    
    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      setCurrentTrack(prevTrack);
      setCurrentIndex(prevIndex);
      setIsPlaying(true);
      savePlayerState(prevTrack, queue, prevIndex);
      
      // Register play
      tracksAPI.playTrack(prevTrack.id, {
        started_at: new Date().toISOString(),
        previous_track: currentTrack?.id
      }).catch(console.error);
    }
  }, [queue, currentIndex, shuffle, repeat, savePlayerState, currentTrack]);
  
  const addToQueue = useCallback((tracks) => {
    const tracksArray = Array.isArray(tracks) ? tracks : [tracks];
    const newQueue = [...queue, ...tracksArray];
    setQueue(newQueue);
    
    // Update saved state if there's a current track
    if (currentTrack) {
      savePlayerState(currentTrack, newQueue, currentIndex);
    }
  }, [queue, currentTrack, currentIndex, savePlayerState]);
  
  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(0);
    
    // Update saved state
    if (currentTrack) {
      savePlayerState(currentTrack, [], 0);
    }
  }, [currentTrack, savePlayerState]);
  
  const setPlayQueue = useCallback((tracks, startIndex = 0) => {
    setQueue(tracks);
    setCurrentIndex(startIndex);
    
    if (tracks[startIndex]) {
      playTrack(tracks[startIndex], tracks);
    }
  }, [playTrack]);
  
  const toggleShuffle = useCallback(() => {
    setShuffle(prev => !prev);
  }, []);
  
  const toggleRepeat = useCallback(() => {
    setRepeat(prev => !prev);
  }, []);
  
  // Method to handle track completion (called by Player component)
  const onTrackCompleted = useCallback((completedTrack, listenPercentage = 100) => {
    // Send completion data to API
    tracksAPI.playTrack(completedTrack.id, {
      listen_percentage: listenPercentage,
      completed_at: new Date().toISOString(),
      duration: completedTrack.duration
    }).catch(console.error);
  }, []);
  
  return {
    // State
    currentTrack,
    isPlaying,
    queue,
    currentIndex,
    shuffle,
    repeat,
    
    // Actions
    playTrack,
    pauseTrack,
    togglePlayPause,
    nextTrack,
    previousTrack,
    addToQueue,
    clearQueue,
    setPlayQueue,
    toggleShuffle,
    toggleRepeat,
    onTrackCompleted,
  };
};