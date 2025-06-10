// components/layout/Player.jsx
import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Heart, ChevronDown, ChevronUp, X } from 'lucide-react';
import { PLACEHOLDER_COVER, formatDuration } from '../../utils/constants';

const Player = ({ 
  currentTrack, 
  isPlaying, 
  onPlayPause, 
  onNext, 
  onPrevious,
  onLike,
  isLiked = false,
  queue = []
}) => {
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  
  // Simulate progress update
  useEffect(() => {
    let interval;
    if (isPlaying && currentTrack) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          const progressPercent = (newTime / currentTrack.duration) * 100;
          setProgress(Math.min(progressPercent, 100));
          
          // Auto next track when finished
          if (newTime >= currentTrack.duration) {
            onNext();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, onNext]);
  
  // Reset progress when track changes
  useEffect(() => {
    setProgress(0);
    setCurrentTime(0);
  }, [currentTrack?.id]);
  
  if (!currentTrack || isHidden) return null;
  
  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = (clickX / rect.width) * 100;
    const newTime = (newProgress / 100) * currentTrack.duration;
    
    setProgress(newProgress);
    setCurrentTime(newTime);
  };
  
  const handleVolumeChange = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newVolume = (clickX / rect.width) * 100;
    setVolume(Math.max(0, Math.min(100, newVolume)));
  };
  
  // Minimized floating player
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-200 shadow-lg p-3 z-30 w-80">
        <div className="flex items-center gap-3">
          <img 
            src={currentTrack.cover_image || PLACEHOLDER_COVER} 
            alt={currentTrack.title}
            className="w-10 h-10 object-cover"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate text-sm">{currentTrack.title}</h4>
            <p className="text-xs text-gray-500 truncate">
              {currentTrack.artist_detail?.username || 'Unknown Artist'}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={onPrevious}
              className="p-1 hover:bg-gray-100 transition-colors"
              disabled={!queue.length}
            >
              <SkipBack className="w-3 h-3" />
            </button>
            
            <button 
              onClick={onPlayPause}
              className="p-2 bg-black text-white hover:bg-gray-800 transition-colors"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
            </button>
            
            <button 
              onClick={onNext}
              className="p-1 hover:bg-gray-100 transition-colors"
              disabled={!queue.length}
            >
              <SkipForward className="w-3 h-3" />
            </button>
            
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 hover:bg-gray-100 transition-colors ml-1"
              title="Развернуть плеер"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setIsHidden(true)}
              className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Скрыть плеер"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Mini Progress Bar */}
        <div className="mt-2">
          <div 
            className="w-full h-1 bg-gray-200 cursor-pointer"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-black transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }
  
  // Full player view
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 z-20">
      {/* Progress Bar */}
      <div className="mb-3">
        <div 
          className="w-full h-1 bg-gray-200 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-black transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatDuration(Math.floor(currentTime))}</span>
          <span>{formatDuration(currentTrack.duration)}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Track Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <img 
            src={currentTrack.cover_image || PLACEHOLDER_COVER} 
            alt={currentTrack.title}
            className="w-12 h-12 object-cover"
          />
          <div className="min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{currentTrack.title}</h4>
            <p className="text-sm text-gray-500 truncate">
              {currentTrack.artist_detail?.username || 'Unknown Artist'}
            </p>
          </div>
          <button 
            onClick={() => onLike(currentTrack)}
            className={`p-1 hover:text-red-500 transition-colors ml-2 ${
              isLiked ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onPrevious} 
            className="p-2 hover:bg-gray-100 transition-colors"
            disabled={!queue.length}
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button 
            onClick={onPlayPause}
            className="p-3 bg-black text-white hover:bg-gray-800 transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          
          <button 
            onClick={onNext} 
            className="p-2 hover:bg-gray-100 transition-colors"
            disabled={!queue.length}
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
        
        {/* Volume & Controls */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <Volume2 className="w-4 h-4 text-gray-400" />
          <div 
            className="w-20 h-1 bg-gray-200 cursor-pointer"
            onClick={handleVolumeChange}
          >
            <div 
              className="h-full bg-black transition-all"
              style={{ width: `${volume}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 w-8">{Math.round(volume)}%</span>
          
          {/* Player Controls */}
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Свернуть плеер"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setIsHidden(true)}
              className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Скрыть плеер"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;