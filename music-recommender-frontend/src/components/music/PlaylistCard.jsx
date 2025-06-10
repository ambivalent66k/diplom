import React from 'react';
import { Play, Music } from 'lucide-react';
import { PLACEHOLDER_COVER, formatNumber } from '../../utils/constants';

const PlaylistCard = ({ 
  playlist, 
  onPlay,
  onClick,
  compact = false 
}) => {
  if (!playlist) return null;
  
  const handlePlay = (e) => {
    e.stopPropagation();
    if (onPlay) onPlay(playlist);
  };
  
  const handleClick = () => {
    if (onClick) onClick(playlist);
  };
  
  if (compact) {
    return (
      <div 
        className="group bg-white border border-gray-100 p-3 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={playlist.cover_image || PLACEHOLDER_COVER} 
              alt={playlist.title}
              className="w-10 h-10 object-cover"
            />
            {onPlay && (
              <button 
                onClick={handlePlay}
                className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Play className="w-3 h-3 text-white ml-0.5" />
              </button>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate text-sm">{playlist.title}</h4>
            <p className="text-xs text-gray-500 truncate">
              {formatNumber(playlist.track_count)} треков
            </p>
          </div>
          
          <Music className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="group bg-white border border-gray-100 p-4 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <img 
            src={playlist.cover_image || PLACEHOLDER_COVER} 
            alt={playlist.title}
            className="w-16 h-16 object-cover"
          />
          {onPlay && (
            <button 
              onClick={handlePlay}
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Play className="w-6 h-6 text-white ml-0.5" />
            </button>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate text-lg">{playlist.title}</h3>
          <p className="text-sm text-gray-500 truncate">
            {playlist.user_detail?.username || 'Unknown User'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {formatNumber(playlist.track_count)} треков
          </p>
          {playlist.description && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
              {playlist.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-gray-400">
          <Music className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default PlaylistCard;