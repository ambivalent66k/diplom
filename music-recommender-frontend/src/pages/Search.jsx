import React, { useState, useEffect, useCallback } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import TrackList from '../components/music/TrackList';
import Input from '../components/common/Input';
import { useTracks } from '../hooks/useApi';

const Search = ({ 
  onPlay, 
  onLike, 
  currentTrack, 
  isPlaying, 
  likedTracks 
}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  const { searchTracks, loading } = useTracks();
  
  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (err) {
        console.error('Failed to load recent searches:', err);
      }
    }
  }, []);
  
  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setHasSearched(true);
      const result = await searchTracks(query);
      if (result.success) {
        setSearchResults(result.data.results || result.data || []);
        
        // Add to recent searches
        const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
        setRecentSearches(newRecent);
        localStorage.setItem('recentSearches', JSON.stringify(newRecent));
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [query, searchTracks, recentSearches]);
  
  const handleClearSearch = () => {
    setQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };
  
  const handleRecentSearch = (searchQuery) => {
    setQuery(searchQuery);
  };
  
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };
  
  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Поиск</h1>
      </div>
      
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <SearchIcon className="w-5 h-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Найти треки, исполнителей..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
      
      {/* Recent Searches */}
      {!query && recentSearches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Недавние поиски</h3>
            <button
              onClick={clearRecentSearches}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Очистить
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleRecentSearch(search)}
                className="px-3 py-2 bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Search Results */}
      {query && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Результаты поиска {query && `для "${query}"`}
          </h3>
          
          <TrackList
            tracks={searchResults}
            onPlay={onPlay}
            onLike={onLike}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            likedTracks={likedTracks}
            loading={loading}
            emptyMessage={
              hasSearched 
                ? `По запросу "${query}" ничего не найдено` 
                : 'Введите запрос для поиска'
            }
          />
        </div>
      )}
      
      {/* Empty State */}
      {!query && recentSearches.length === 0 && (
        <div className="text-center py-12">
          <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Найдите любимую музыку
          </h3>
          <p className="text-gray-500">
            Ищите треки по названию или исполнителю
          </p>
        </div>
      )}
    </div>
  );
};

export default Search;