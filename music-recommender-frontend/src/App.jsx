// App.jsx
import React, { useState, useEffect } from 'react';
import Navigation from './components/layout/Navigation';
import Player from './components/layout/Player';
import LoadingSpinner from './components/common/LoadingSpinner';

// Pages
import Auth from './pages/Auth';
import Home from './pages/Home';
import Search from './pages/Search';
import Library from './pages/Library';
import Discover from './pages/Discover';
import Profile from './pages/Profile';
import Upload from './pages/Upload';

// Hooks
import { useAuth } from './hooks/useAuth';
import { usePlayer } from './hooks/usePlayer';
import { useTracks } from './hooks/useApi';
import { STORAGE_KEYS } from './utils/constants';

const App = () => {
  const [activeTab, setActiveTab] = useState('home');

  // Auth state
  const { 
    user, 
    isAuthenticated, 
    loading: authLoading, 
    logout 
  } = useAuth();

  // Player state
  const {
    currentTrack,
    isPlaying,
    queue,
    playTrack,
    togglePlayPause,
    nextTrack,
    previousTrack,
  } = usePlayer();

  // Tracks state for likes
  const { 
    likedTrackIds, 
    likeTrack,
    loadLikedTracks 
  } = useTracks();

  // User state for profile management
  const [currentUser, setCurrentUser] = useState(user);

  // Update user when auth user changes
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  // Load liked tracks when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadLikedTracks();
    }
  }, [isAuthenticated, loadLikedTracks]);

  // Handle play track
  const handlePlay = (track, newQueue = []) => {
    playTrack(track, newQueue);
  };

  // Handle like track
  const handleLike = async (track) => {
    await likeTrack(track);
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    setActiveTab('home');
  };

  // Handle navigation
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // Handle user profile update
  const handleUpdateUser = (userData) => {
    const updatedUser = { ...currentUser, ...userData };
    setCurrentUser(updatedUser);
    
    // Update localStorage
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    
    // В реальном приложении здесь был бы API запрос
    console.log('User updated:', updatedUser);
  };

  // Render page content
  const renderPageContent = () => {
    const pageProps = {
      onPlay: handlePlay,
      onLike: handleLike,
      currentTrack,
      isPlaying,
      likedTracks: likedTrackIds,
    };

    switch (activeTab) {
      case 'home':
        return <Home {...pageProps} />;
      case 'search':
        return <Search {...pageProps} />;
      case 'library':
        return <Library {...pageProps} />;
      case 'discover':
        return <Discover {...pageProps} />;
      case 'upload':
        return <Upload />;
      case 'profile':
        return <Profile 
          user={currentUser} 
          onUpdateUser={handleUpdateUser} 
        />;
      default:
        return <Home {...pageProps} />;
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner text="Загрузка приложения..." />
      </div>
    );
  }

  // Not authenticated - show auth page
  if (!isAuthenticated) {
    return <Auth />;
  }

  // Main app layout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Sidebar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className={`ml-64 p-8 ${currentTrack ? 'pb-32' : 'pb-8'}`}>
        <div className="max-w-6xl">
          {renderPageContent()}
        </div>
      </main>

      {/* Global Music Player */}
      <Player
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={togglePlayPause}
        onNext={nextTrack}
        onPrevious={previousTrack}
        onLike={handleLike}
        isLiked={currentTrack ? likedTrackIds.has(currentTrack.id) : false}
        queue={queue}
      />
    </div>
  );
};

export default App;