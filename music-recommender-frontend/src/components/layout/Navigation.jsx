// components/layout/Navigation.jsx
import React, { useState } from 'react';
import { Home, Search, Library, Compass, User, Settings, LogOut, Camera, Upload } from 'lucide-react';
import { TABS } from '../../utils/constants';

const Navigation = ({ activeTab, onTabChange, user, onLogout }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const tabIcons = {
    home: Home,
    search: Search,
    library: Library,
    discover: Compass,
    upload: Upload,
    profile: Settings,
  };
  
  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };
  
  const handleProfileMenuClose = () => {
    setShowProfileMenu(false);
  };
  
  const handleLogout = () => {
    setShowProfileMenu(false);
    onLogout();
  };
  
  const handleProfileSettings = () => {
    setShowProfileMenu(false);
    onTabChange('profile');
  };
  
  // Get user avatar or show initials
  const getUserAvatar = () => {
    if (user?.avatar) {
      return (
        <img 
          src={user.avatar} 
          alt={user.username}
          className="w-10 h-10 object-cover rounded-full"
        />
      );
    }
    
    // Show user initials as fallback
    const initials = user?.username?.substring(0, 2).toUpperCase() || 'U';
    return (
      <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 text-white text-sm font-medium flex items-center justify-center rounded-full">
        {initials}
      </div>
    );
  };
  
  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6 z-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Music</h1>
        <p className="text-sm text-gray-500">Рекомендации</p>
      </div>
      
      {/* Navigation Tabs */}
      <div className="space-y-2 mb-8">
        {TABS.map(tab => {
          const Icon = tabIcons[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg ${
                activeTab === tab.id 
                  ? 'bg-black text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>
      
      {/* User Profile */}
      {user && (
        <div className="absolute bottom-6 left-6 right-6">
          <div className="relative">
            {/* Profile Button */}
            <button
              onClick={handleProfileClick}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                showProfileMenu ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {getUserAvatar()}
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-gray-900 truncate">{user.username}</p>
                <p className="text-xs text-gray-500">Профиль</p>
              </div>
              <div className={`transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <>
                {/* Overlay to close menu when clicking outside */}
                <div 
                  className="fixed inset-0 z-10"
                  onClick={handleProfileMenuClose}
                />
                
                {/* Menu */}
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      {getUserAvatar()}
                      <div>
                        <p className="font-medium text-gray-900">{user.username}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-2">
                    <button
                      onClick={handleProfileSettings}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Настройки профиля
                    </button>
                    
                    <hr className="my-1" />
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Выйти
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;