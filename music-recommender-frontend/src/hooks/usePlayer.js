// hooks/usePlayer.js
import { useState, useCallback, useEffect } from 'react';
import { tracksAPI, recommendationsAPI } from '../services/api';
import { STORAGE_KEYS, INTERACTION_TYPES } from '../utils/constants';

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
      // Register play interaction with API
      await tracksAPI.playTrack(track.id);
      
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
      // Random next track
      nextIndex = Math.floor(Math.random() * queue.length);
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
      tracksAPI.playTrack(nextTrack.id).catch(console.error);
    }
  }, [queue, currentIndex, shuffle, repeat, savePlayerState]);
  
  const previousTrack = useCallback(() => {
    if (queue.length === 0) return;
    
    let prevIndex;
    
    if (shuffle) {
      // Random previous track
      prevIndex = Math.floor(Math.random() * queue.length);
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
      tracksAPI.playTrack(prevTrack.id).catch(console.error);
    }
  }, [queue, currentIndex, shuffle, repeat, savePlayerState]);
  
  const addToQueue = useCallback((tracks) => {
    const tracksArray = Array.isArray(tracks) ? tracks : [tracks];
    setQueue(prev => [...prev, ...tracksArray]);
  }, []);
  
  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(0);
  }, []);
  
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
  };
};