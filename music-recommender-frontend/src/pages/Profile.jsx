import React, { useState, useEffect } from 'react';
import { Camera, Edit3, Save, X, User, Music, Heart, Clock, TrendingUp, Calendar, Headphones } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatNumber, formatDate } from '../utils/constants';

const Profile = ({ user, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Form data for editing profile
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    location: user?.location || '',
  });
  
  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  
  useEffect(() => {
    loadUserStats();
  }, []);
  
  const loadUserStats = async () => {
    setLoading(true);
    try {
      // Mock статистика - в реальном приложении будет API запрос
      const mockStats = {
        totalPlays: 1247,
        totalListeningTime: 18450, // в минутах
        likedTracks: 89,
        joinDate: '2024-01-15',
        topGenres: [
          { name: 'Electronic', plays: 312 },
          { name: 'Rock', plays: 289 },
          { name: 'Hip-Hop', plays: 156 },
          { name: 'Jazz', plays: 98 },
        ],
        recentActivity: [
          { type: 'play', track: 'Bohemian Rhapsody', artist: 'Queen', time: '2 часа назад' },
          { type: 'like', track: 'Stairway to Heaven', artist: 'Led Zeppelin', time: '1 день назад' },
          { type: 'play', track: 'Hotel California', artist: 'Eagles', time: '2 дня назад' },
        ],
        streakDays: 15,
        averageSessionTime: 45, // в минутах
      };
      
      setTimeout(() => {
        setStats(mockStats);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading stats:', error);
      setLoading(false);
    }
  };
  
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSaveProfile = async () => {
    try {
      const updateData = {
        ...formData,
        avatar: avatarPreview,
      };
      
      // В реальном приложении здесь будет API запрос
      if (onUpdateUser) {
        onUpdateUser(updateData);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };
  
  const handleCancelEdit = () => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      bio: user?.bio || '',
      location: user?.location || '',
    });
    setAvatarPreview(user?.avatar || null);
    setAvatarFile(null);
    setIsEditing(false);
  };
  
  const getUserAvatar = (size = 'w-24 h-24') => {
    if (avatarPreview) {
      return (
        <img 
          src={avatarPreview} 
          alt={user?.username}
          className={`${size} object-cover rounded-full`}
        />
      );
    }
    
    const initials = user?.username?.substring(0, 2).toUpperCase() || 'U';
    return (
      <div className={`${size} bg-gradient-to-br from-gray-400 to-gray-600 text-white text-2xl font-medium flex items-center justify-center rounded-full`}>
        {initials}
      </div>
    );
  };
  
  const tabs = [
    { id: 'profile', label: 'Профиль', icon: User },
    { id: 'stats', label: 'Статистика', icon: TrendingUp },
  ];
  
  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex items-start gap-6">
          <div className="relative">
            {getUserAvatar()}
            
            {isEditing && (
              <label className="absolute bottom-0 right-0 bg-black text-white p-2 cursor-pointer hover:bg-gray-800 transition-colors">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
          
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <Input
                  placeholder="Имя пользователя"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
                <Input
                  placeholder="О себе"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                />
                <Input
                  placeholder="Местоположение"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
                
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile}>
                    <Save className="w-4 h-4 mr-2" />
                    Сохранить
                  </Button>
                  <Button variant="secondary" onClick={handleCancelEdit}>
                    <X className="w-4 h-4 mr-2" />
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-2xl font-bold text-gray-900">{user?.username}</h1>
                  <Button 
                    variant="ghost" 
                    size="small"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Редактировать
                  </Button>
                </div>
                
                <p className="text-gray-600 mb-2">{user?.email}</p>
                {user?.bio && <p className="text-gray-700 mb-2">{user.bio}</p>}
                {user?.location && (
                  <p className="text-gray-500 text-sm">📍 {user.location}</p>
                )}
                {stats && (
                  <p className="text-gray-500 text-sm mt-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    С нами с {formatDate(stats.joinDate)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 p-4 text-center">
            <Music className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalPlays)}</p>
            <p className="text-sm text-gray-500">Прослушиваний</p>
          </div>
          
          <div className="bg-white border border-gray-200 p-4 text-center">
            <Heart className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold text-gray-900">{stats.likedTracks}</p>
            <p className="text-sm text-gray-500">Лайков</p>
          </div>
          
          <div className="bg-white border border-gray-200 p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-2xl font-bold text-gray-900">{Math.round(stats.totalListeningTime / 60)}</p>
            <p className="text-sm text-gray-500">Часов музыки</p>
          </div>
          
          <div className="bg-white border border-gray-200 p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-gray-900">{stats.streakDays}</p>
            <p className="text-sm text-gray-500">Дней подряд</p>
          </div>
        </div>
      )}
    </div>
  );
  
  const renderStatsTab = () => {
    if (loading) {
      return <LoadingSpinner text="Загружаем статистику..." />;
    }
    
    if (!stats) {
      return (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Статистика недоступна
          </h3>
          <p className="text-gray-500">
            Послушайте больше музыки, чтобы увидеть статистику
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Listening Stats */}
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Статистика прослушиваний</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <Headphones className="w-12 h-12 mx-auto mb-2 text-blue-500" />
              <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalPlays)}</p>
              <p className="text-sm text-gray-500">Всего прослушиваний</p>
            </div>
            
            <div className="text-center">
              <Clock className="w-12 h-12 mx-auto mb-2 text-purple-500" />
              <p className="text-3xl font-bold text-gray-900">{Math.round(stats.totalListeningTime / 60)}</p>
              <p className="text-sm text-gray-500">Часов прослушано</p>
            </div>
            
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p className="text-3xl font-bold text-gray-900">{stats.averageSessionTime}</p>
              <p className="text-sm text-gray-500">Мин. за сессию</p>
            </div>
          </div>
        </div>
        
        {/* Top Genres */}
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Любимые жанры</h3>
          
          <div className="space-y-3">
            {stats.topGenres.map((genre, index) => (
              <div key={genre.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                  <span className="font-medium text-gray-900">{genre.name}</span>
                </div>
                <span className="text-gray-500">{formatNumber(genre.plays)} прослушиваний</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Недавняя активность</h3>
          
          <div className="space-y-3">
            {stats.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50">
                <div className="w-8 h-8 flex items-center justify-center bg-gray-200">
                  {activity.type === 'play' ? (
                    <Music className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Heart className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.track}</p>
                  <p className="text-sm text-gray-500">{activity.artist}</p>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Профиль</h1>
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
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'stats' && renderStatsTab()}
      </div>
    </div>
  );
};

export default Profile;