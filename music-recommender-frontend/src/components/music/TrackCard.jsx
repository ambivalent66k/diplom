// components/music/TrackCard.jsx
import React from 'react';
import { Play, Pause, Heart } from 'lucide-react';
import { PLACEHOLDER_COVER, formatDuration } from '../../utils/constants';

const TrackCard = ({ 
  track, 
  onPlay, 
  onLike, 
  isPlaying = false, 
  isLiked = false,
  showArtist = true,
  compact = false
}) => {
  if (!track) return null;
  
  const handlePlay = (e) => {
    e.stopPropagation();
    onPlay(track);
  };
  
  const handleLike = (e) => {
    e.stopPropagation();
    onLike(track);
  };
  
  if (compact) {
    return (
      <div className="group bg-white border border-gray-100 p-3 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={track.cover_image || PLACEHOLDER_COVER} 
              alt={track.title}
              className="w-10 h-10 object-cover"
            />
            <button 
              onClick={handlePlay}
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isPlaying ? 
                <Pause className="w-3 h-3 text-white" /> : 
                <Play className="w-3 h-3 text-white ml-0.5" />
              }
            </button>
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate text-sm">{track.title}</h4>
            {showArtist && (
              <p className="text-xs text-gray-500 truncate">
                {track.artist_detail?.username || 'Unknown Artist'}
              </p>
            )}
          </div>
          
          <button 
            onClick={handleLike}
            className={`p-1 hover:text-red-500 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400'}`}
          >
            <Heart className="w-3 h-3" fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="group bg-white border border-gray-100 p-4 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img 
            src={track.cover_image || PLACEHOLDER_COVER} 
            alt={track.title}
            className="w-12 h-12 object-cover"
          />
          <button 
            onClick={handlePlay}
            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isPlaying ? 
              <Pause className="w-4 h-4 text-white" /> : 
              <Play className="w-4 h-4 text-white ml-0.5" />
            }
          </button>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{track.title}</h3>
          {showArtist && (
            <p className="text-sm text-gray-500 truncate">
              {track.artist_detail?.username || 'Unknown Artist'}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-gray-400">
          <span className="text-xs">{formatDuration(track.duration)}</span>
          <button 
            onClick={handleLike}
            className={`p-1 hover:text-red-500 transition-colors ${isLiked ? 'text-red-500' : ''}`}
          >
            <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackCard;