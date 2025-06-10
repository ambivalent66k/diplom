import React, { useEffect } from 'react';
import TrackList from '../components/music/TrackList';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import { useTracks, useRecommendations } from '../hooks/useApi';

const Home = ({ 
  onPlay, 
  onLike, 
  currentTrack, 
  isPlaying, 
  likedTracks 
}) => {
  const { 
    trending, 
    loadTrending,
    loading: tracksLoading 
  } = useTracks();
  
  const {
    forYou,
    loadForYou,
    refreshRecommendations,
    loading: recsLoading
  } = useRecommendations();
  
  useEffect(() => {
    loadTrending();
    loadForYou();
  }, [loadTrending, loadForYou]);
  
  const handleRefreshRecommendations = async () => {
    await refreshRecommendations();
  };
  
  if (tracksLoading && recsLoading) {
    return <LoadingSpinner text="Загружаем рекомендации..." />;
  }
  
  return (
    <div className="space-y-8">
      {/* Recommendations Section */}
      {forYou.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Рекомендации для вас</h2>
            <Button
              variant="secondary"
              size="small"
              onClick={handleRefreshRecommendations}
              loading={recsLoading}
            >
              Обновить
            </Button>
          </div>
          
          <TrackList
            tracks={forYou.slice(0, 10)}
            onPlay={onPlay}
            onLike={onLike}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            likedTracks={likedTracks}
            loading={recsLoading}
            emptyMessage="Рекомендации пока недоступны. Послушайте несколько треков, чтобы получить персональные рекомендации."
          />
        </section>
      )}
      
      {/* Trending Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Популярные треки</h2>
        
        <TrackList
          tracks={trending.slice(0, 20)}
          onPlay={onPlay}
          onLike={onLike}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          likedTracks={likedTracks}
          loading={tracksLoading}
          emptyMessage="Популярные треки пока недоступны"
        />
      </section>
      
      {/* Welcome Message for New Users */}
      {!forYou.length && !trending.length && !tracksLoading && !recsLoading && (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-900 mb-4">
            Добро пожаловать в Music!
          </h3>
          <p className="text-gray-500 mb-6">
            Начните слушать музыку, чтобы получать персональные рекомендации
          </p>
          <Button onClick={handleRefreshRecommendations}>
            Загрузить музыку
          </Button>
        </div>
      )}
    </div>
  );
};

export default Home;