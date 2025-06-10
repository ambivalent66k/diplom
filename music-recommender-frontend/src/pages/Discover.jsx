import React, { useState, useEffect } from 'react';
import { Music, TrendingUp, Users, Sparkles } from 'lucide-react';
import TrackList from '../components/music/TrackList';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useRecommendations, useGenres } from '../hooks/useApi';

const Discover = ({ 
  onPlay, 
  onLike, 
  currentTrack, 
  isPlaying, 
  likedTracks 
}) => {
  const [activeSection, setActiveSection] = useState('recommendations');
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [genreTracks, setGenreTracks] = useState([]);
  
  const {
    byType,
    similarTracks,
    loadByType,
    loadSimilarTracks,
    loadByGenre,
    loading: recsLoading
  } = useRecommendations();
  
  const { genres, loading: genresLoading } = useGenres();
  
  useEffect(() => {
    loadByType();
    loadSimilarTracks();
  }, [loadByType, loadSimilarTracks]);
  
  const handleGenreSelect = async (genre) => {
    setSelectedGenre(genre);
    setActiveSection('genre');
    
    const result = await loadByGenre(genre.id);
    if (result.success) {
      setGenreTracks(result.data || []);
    }
  };
  
  const sections = [
    {
      id: 'recommendations',
      label: 'Рекомендации',
      icon: Sparkles,
      description: 'Персональные рекомендации разных типов'
    },
    {
      id: 'similar',
      label: 'Похожие треки',
      icon: Users,
      description: 'Треки, похожие на те, что вы слушали'
    },
    {
      id: 'genres',
      label: 'По жанрам',
      icon: Music,
      description: 'Изучайте музыку по жанрам'
    },
  ];
  
  const renderRecommendations = () => {
    if (recsLoading) {
      return <LoadingSpinner />;
    }
    
    const { collaborative = [], content_based = [], popularity = [] } = byType;
    
    return (
      <div className="space-y-8">
        {collaborative.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Коллаборативные рекомендации
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              На основе предпочтений похожих пользователей
            </p>
            <TrackList
              tracks={collaborative.slice(0, 5)}
              onPlay={onPlay}
              onLike={onLike}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedTracks={likedTracks}
              compact
            />
          </section>
        )}
        
        {content_based.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Контентные рекомендации
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              На основе характеристик треков, которые вы слушали
            </p>
            <TrackList
              tracks={content_based.slice(0, 5)}
              onPlay={onPlay}
              onLike={onLike}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedTracks={likedTracks}
              compact
            />
          </section>
        )}
        
        {popularity.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">
                Популярные рекомендации
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Популярные треки, которые могут вам понравиться
            </p>
            <TrackList
              tracks={popularity.slice(0, 5)}
              onPlay={onPlay}
              onLike={onLike}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              likedTracks={likedTracks}
              compact
            />
          </section>
        )}
        
        {!collaborative.length && !content_based.length && !popularity.length && (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Рекомендации пока недоступны
            </h3>
            <p className="text-gray-500">
              Послушайте несколько треков, чтобы получить персональные рекомендации
            </p>
          </div>
        )}
      </div>
    );
  };
  
  const renderSimilarTracks = () => {
    return (
      <div className="space-y-4">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Похожие треки
          </h3>
          <p className="text-sm text-gray-500">
            Треки, похожие на те, которые вы уже слушали
          </p>
        </div>
        
        <TrackList
          tracks={similarTracks}
          onPlay={onPlay}
          onLike={onLike}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          likedTracks={likedTracks}
          loading={recsLoading}
          emptyMessage="Похожие треки появятся после того, как вы послушаете несколько композиций"
        />
      </div>
    );
  };
  
  const renderGenres = () => {
    if (selectedGenre) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="secondary"
              size="small"
              onClick={() => {
                setSelectedGenre(null);
                setGenreTracks([]);
              }}
            >
              ← Назад
            </Button>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {selectedGenre.name}
              </h3>
              {selectedGenre.description && (
                <p className="text-sm text-gray-500">
                  {selectedGenre.description}
                </p>
              )}
            </div>
          </div>
          
          <TrackList
            tracks={genreTracks}
            onPlay={onPlay}
            onLike={onLike}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            likedTracks={likedTracks}
            loading={recsLoading}
            emptyMessage={`Треки в жанре "${selectedGenre.name}" не найдены`}
          />
        </div>
      );
    }
    
    if (genresLoading) {
      return <LoadingSpinner />;
    }
    
    return (
      <div className="space-y-4">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Музыкальные жанры
          </h3>
          <p className="text-sm text-gray-500">
            Выберите жанр для изучения
          </p>
        </div>
        
        {genres.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {genres.map(genre => (
              <button
                key={genre.id}
                onClick={() => handleGenreSelect(genre)}
                className="p-4 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 flex items-center justify-center">
                    <Music className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {genre.name}
                    </h4>
                    {genre.description && (
                      <p className="text-xs text-gray-500 truncate">
                        {genre.description}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Жанры недоступны
            </h3>
            <p className="text-gray-500">
              Жанры пока не загружены
            </p>
          </div>
        )}
      </div>
    );
  };
  
  const renderContent = () => {
    switch (activeSection) {
      case 'recommendations':
        return renderRecommendations();
      case 'similar':
        return renderSimilarTracks();
      case 'genres':
      case 'genre':
        return renderGenres();
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Обзор</h1>
      </div>
      
      {/* Navigation */}
      {!selectedGenre && (
        <div className="flex gap-2">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                  activeSection === section.id 
                    ? 'bg-black text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={section.description}
              >
                <Icon className="w-4 h-4" />
                {section.label}
              </button>
            );
          })}
        </div>
      )}
      
      {/* Content */}
      <div>
        {renderContent()}
      </div>
    </div>
  );
};

export default Discover;