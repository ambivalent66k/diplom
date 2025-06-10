import React from 'react';
import TrackCard from './TrackCard';
import LoadingSpinner from '../common/LoadingSpinner';

const TrackList = ({ 
  tracks = [], 
  loading = false,
  onPlay,
  onLike,
  currentTrack,
  isPlaying,
  likedTracks = new Set(),
  title = '',
  compact = false,
  emptyMessage = 'Треки не найдены'
}) => {
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!tracks.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {title && (
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      )}
      
      <div className={compact ? 'space-y-2' : 'space-y-3'}>
        {tracks.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            onPlay={onPlay}
            onLike={onLike}
            isPlaying={currentTrack?.id === track.id && isPlaying}
            isLiked={likedTracks.has(track.id)}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
};

export default TrackList;