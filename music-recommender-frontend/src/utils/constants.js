export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  PLAYER_STATE: 'player_state',
};

export const INTERACTION_TYPES = {
  PLAY: 'play',
  LIKE: 'like',
  SKIP: 'skip',
  ADD_TO_PLAYLIST: 'add_to_playlist',
  SHARE: 'share',
};

export const RECOMMENDATION_TYPES = {
  COLLABORATIVE: 'collaborative',
  CONTENT_BASED: 'content_based',
  POPULARITY: 'popularity',
  HYBRID: 'hybrid',
};

export const TABS = [
  { id: 'home', label: 'Главная' },
  { id: 'search', label: 'Поиск' },
  { id: 'library', label: 'Библиотека' },
  { id: 'discover', label: 'Обзор' },
  { id: 'upload', label: 'Загрузить' },
  { id: 'profile', label: 'Профиль' },
];

export const PLACEHOLDER_COVER = '/placeholder-cover.png';

export const PLAYER_ACTIONS = {
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  NEXT: 'NEXT',
  PREVIOUS: 'PREVIOUS',
  SET_TRACK: 'SET_TRACK',
  SET_QUEUE: 'SET_QUEUE',
  TOGGLE_SHUFFLE: 'TOGGLE_SHUFFLE',
  TOGGLE_REPEAT: 'TOGGLE_REPEAT',
};

export const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};