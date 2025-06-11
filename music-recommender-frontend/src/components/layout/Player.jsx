// components/layout/Player.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  const [duration, setDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Ref для аудио элемента
  const audioRef = useRef(null);
  
  // Инициализация аудио при изменении трека
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    
    const audio = audioRef.current;
    
    // Сброс состояния
    setCurrentTime(0);
    setProgress(0);
    setDuration(0);
    setError(null);
    setIsLoading(true);
    
    // Используем полный URL из API или формируем его
    const audioUrl = currentTrack.audio_file_url || 
      (currentTrack.audio_file?.startsWith('http') 
        ? currentTrack.audio_file 
        : `http://localhost:8000${currentTrack.audio_file}`);
    
    // Устанавливаем источник аудио
    audio.src = audioUrl;
    audio.load();
    
    // Отправляем запрос на сервер о начале воспроизведения
    fetch('http://localhost:8000/api/tracks/' + currentTrack.id + '/play/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        interaction_data: { started_at: new Date().toISOString() }
      })
    }).catch(console.error);
    
  }, [currentTrack?.id]);
  
  // Управление воспроизведением
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    
    const audio = audioRef.current;
    
    if (isPlaying && !error) {
      audio.play().catch(err => {
        console.error('Ошибка воспроизведения:', err);
        setError('Не удалось воспроизвести трек');
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack?.id, error]);
  
  // Управление громкостью
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);
  
  // Обработчики событий аудио
  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };
  
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;
      setDuration(audioDuration);
      setIsLoading(false);
    }
  };
  
  const handleTimeUpdate = () => {
    if (audioRef.current && duration > 0) {
      const audio = audioRef.current;
      const currentTime = audio.currentTime;
      const progressPercent = (currentTime / duration) * 100;
      
      setCurrentTime(currentTime);
      setProgress(progressPercent);
    }
  };
  
  const handleEnded = () => {
    setProgress(100);
    setCurrentTime(duration);
    
    // Отправляем информацию о завершении прослушивания
    if (currentTrack) {
      fetch('http://localhost:8000/api/tracks/' + currentTrack.id + '/play/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          listen_percentage: 100,
          interaction_data: { 
            completed_at: new Date().toISOString(),
            duration: duration 
          }
        })
      }).catch(console.error);
    }
    
    // Автоматически переключаем на следующий трек
    onNext();
  };
  
  const handleError = (e) => {
    console.error('Ошибка загрузки аудио:', e);
    setError('Ошибка загрузки аудио файла');
    setIsLoading(false);
  };
  
  const handleCanPlay = () => {
    setIsLoading(false);
    setError(null);
  };
  
  const handleWaiting = () => {
    setIsLoading(true);
  };
  
  const handleCanPlayThrough = () => {
    setIsLoading(false);
  };
  
  // Обработка клика по прогресс-бару
  const handleProgressClick = (e) => {
    if (!audioRef.current || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = (clickX / rect.width) * 100;
    const newTime = (newProgress / 100) * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(newProgress);
  };
  
  // Обработка изменения громкости
  const handleVolumeChange = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newVolume = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    setVolume(newVolume);
  };
  
  // Если нет трека или скрыт
  if (!currentTrack || isHidden) return null;
  
  // Минимизированный плеер
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
              className="p-2 bg-black text-white hover:bg-gray-800 transition-colors relative"
              disabled={isLoading || error}
            >
              {isLoading ? (
                <div className="w-3 h-3 border border-white border-t-transparent animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3 ml-0.5" />
              )}
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
        
        {/* Error message */}
        {error && (
          <div className="mt-1 text-xs text-red-500">{error}</div>
        )}
      </div>
    );
  }
  
  // Полный плеер
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
          <span>{formatDuration(Math.floor(duration))}</span>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-3 text-center text-sm text-red-500 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      
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
            className="p-3 bg-black text-white hover:bg-gray-800 transition-colors relative"
            disabled={isLoading || error}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
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
      
      {/* HTML5 Audio Element */}
      <audio
        ref={audioRef}
        onLoadStart={handleLoadStart}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        onCanPlay={handleCanPlay}
        onWaiting={handleWaiting}
        onCanPlayThrough={handleCanPlayThrough}
        preload="metadata"
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default Player;