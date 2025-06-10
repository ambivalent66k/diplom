import React, { useState, useEffect } from 'react';
import { Heart, Music, Plus, User } from 'lucide-react';
import TrackList from '../components/music/TrackList';
import PlaylistCard from '../components/music/PlaylistCard';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useTracks, usePlaylists } from '../hooks/useApi';

const Library = ({ 
  onPlay, 
  onLike, 
  currentTrack, 
  isPlaying, 
  likedTracks 
}) => {
  const [activeTab, setActiveTab] = useState('liked');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  
  const { 
    myTracks,
    likedTracks: likedTracksData,
    loadMyTracks,
    loadLikedTracks,
    loading: tracksLoading 
  } = useTracks();
  
  const {
    myPlaylists,
    loadMyPlaylists,
    createPlaylist,
    loading: playlistsLoading
  } = usePlaylists();
  
  useEffect(() => {
    loadMyTracks();
    loadLikedTracks();
    loadMyPlaylists();
  }, [loadMyTracks, loadLikedTracks, loadMyPlaylists]);
  
  const tabs = [
    { id: 'liked', label: 'Любимые треки', icon: Heart },
    { id: 'tracks', label: 'Мои треки', icon: Music },
    { id: 'playlists', label: 'Плейлисты', icon: User },
  ];
  
  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    
    if (!newPlaylistName.trim()) return;
    
    const result = await createPlaylist({
      title: newPlaylistName.trim(),
      description: newPlaylistDescription.trim(),
      is_public: true,
    });
    
    if (result.success) {
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setShowCreatePlaylist(false);
    }
  };
  
  const renderContent = () => {
    switch (activeTab) {
      case 'liked':
        return (
          <TrackList
            tracks={likedTracksData}
            onPlay={onPlay}
            onLike={onLike}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            likedTracks={likedTracks}
            loading={tracksLoading}
            emptyMessage="У вас пока нет любимых треков. Поставьте лайк трекам, которые вам нравятся!"
          />
        );
      
      case 'tracks':
        return (
          <TrackList
            tracks={myTracks}
            onPlay={onPlay}
            onLike={onLike}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            likedTracks={likedTracks}
            loading={tracksLoading}
            emptyMessage="У вас пока нет загруженных треков"
            showArtist={false}
          />
        );
      
      case 'playlists':
        return (
          <div className="space-y-4">
            {/* Create Playlist Button */}
            <Button
              onClick={() => setShowCreatePlaylist(true)}
              variant="secondary"
              className="mb-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать плейлист
            </Button>
            
            {/* Create Playlist Form */}
            {showCreatePlaylist && (
              <div className="bg-white border border-gray-200 p-4 mb-4">
                <h3 className="font-medium text-gray-900 mb-4">Создать новый плейлист</h3>
                
                <div className="space-y-3">
                  <Input
                    placeholder="Название плейлиста"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                  />
                  
                  <Input
                    placeholder="Описание (необязательно)"
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  />
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreatePlaylist}
                      loading={playlistsLoading}
                      disabled={!newPlaylistName.trim()}
                    >
                      Создать
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowCreatePlaylist(false);
                        setNewPlaylistName('');
                        setNewPlaylistDescription('');
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Playlists List */}
            {playlistsLoading ? (
              <LoadingSpinner />
            ) : myPlaylists.length > 0 ? (
              <div className="space-y-3">
                {myPlaylists.map(playlist => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onClick={(playlist) => {
                      // TODO: Navigate to playlist detail
                      console.log('Open playlist:', playlist);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  У вас пока нет плейлистов
                </h3>
                <p className="text-gray-500 mb-4">
                  Создайте свой первый плейлист и добавьте в него любимые треки
                </p>
                <Button onClick={() => setShowCreatePlaylist(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Создать плейлист
                </Button>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Библиотека</h1>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                activeTab === tab.id 
                  ? 'bg-black text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      
      {/* Content */}
      <div>
        {renderContent()}
      </div>
    </div>
  );
};

export default Library;