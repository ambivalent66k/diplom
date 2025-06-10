// pages/Upload.jsx
import React, { useState, useRef } from 'react';
import { Upload as UploadIcon, Music, X, Play, Pause, AlertCircle, CheckCircle, Image } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Upload = () => {
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    description: '',
    tags: '',
  });
  
  // File states
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  
  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Audio preview
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  
  // File input refs
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);
  
  // Available genres
  const genres = [
    'Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical', 
    'Country', 'R&B', 'Folk', 'Reggae', 'Blues', 'Funk', 'Other'
  ];
  
  // Handle audio file selection
  const handleAudioFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
      if (!validTypes.includes(file.type)) {
        setUploadError('Поддерживаются только форматы: MP3, WAV, OGG');
        return;
      }
      
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setUploadError('Размер файла не должен превышать 50MB');
        return;
      }
      
      setAudioFile(file);
      setUploadError('');
      
      // Auto-fill title from filename
      if (!formData.title) {
        const filename = file.name.replace(/\.[^/.]+$/, '');
        setFormData(prev => ({ ...prev, title: filename }));
      }
      
      // Create audio URL for preview
      const audioUrl = URL.createObjectURL(file);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
      }
    }
  };
  
  // Handle cover file selection
  const handleCoverFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setUploadError('Поддерживаются только форматы: JPG, PNG, WebP');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Размер изображения не должен превышать 5MB');
        return;
      }
      
      setCoverFile(file);
      setUploadError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Audio controls
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };
  
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!audioFile) {
      setUploadError('Выберите аудио файл');
      return;
    }
    
    if (!formData.title.trim()) {
      setUploadError('Введите название трека');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');
    setUploadSuccess(false);
    
    try {
      // Create FormData for multipart upload
      const uploadData = new FormData();
      uploadData.append('audio_file', audioFile);
      uploadData.append('title', formData.title.trim());
      uploadData.append('genre', formData.genre);
      uploadData.append('description', formData.description.trim());
      uploadData.append('tags', formData.tags.trim());
      
      if (coverFile) {
        uploadData.append('cover_image', coverFile);
      }
      
      // Get token for authorization
      const token = localStorage.getItem('token');
      
      // Upload with progress tracking
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          console.log('Track uploaded successfully:', response);
          setUploadSuccess(true);
          setUploadProgress(100);
          
          // Reset form after successful upload
          setTimeout(() => {
            resetForm();
          }, 2000);
        } else {
          throw new Error(`HTTP error! status: ${xhr.status}`);
        }
      });
      
      xhr.addEventListener('error', () => {
        throw new Error('Network error occurred');
      });
      
      xhr.open('POST', 'http://127.0.0.1:8000/api/tracks/');
      if (token) {
        xhr.setRequestHeader('Authorization', `Token ${token}`);
      }
      
      xhr.send(uploadData);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Ошибка при загрузке трека');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      genre: '',
      description: '',
      tags: '',
    });
    setAudioFile(null);
    setCoverFile(null);
    setCoverPreview(null);
    setUploadProgress(0);
    setUploadError('');
    setUploadSuccess(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    
    // Reset file inputs
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (coverInputRef.current) coverInputRef.current.value = '';
  };
  
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <UploadIcon className="w-8 h-8 text-gray-600" />
        <h1 className="text-2xl font-bold text-gray-900">Загрузить трек</h1>
      </div>
      
      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Files */}
          <div className="space-y-6">
            {/* Audio File Upload */}
            <div className="bg-white border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Аудио файл</h3>
              
              {!audioFile ? (
                <div
                  onClick={() => audioInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Нажмите, чтобы выбрать аудио файл</p>
                  <p className="text-sm text-gray-500">MP3, WAV, OGG до 50MB</p>
                </div>
              ) : (
                <div className="bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Music className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">{audioFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAudioFile(null);
                        if (audioInputRef.current) audioInputRef.current.value = '';
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Audio Preview */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlayback}
                      className="p-2 bg-black text-white hover:bg-gray-800 transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </div>
                      <div className="w-full h-1 bg-gray-200">
                        <div 
                          className="h-full bg-black transition-all"
                          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioFileChange}
                className="hidden"
              />
            </div>
            
            {/* Cover Image Upload */}
            <div className="bg-white border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Обложка</h3>
              
              {!coverPreview ? (
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 p-8 text-center cursor-pointer hover:border-gray-400 transition-colors aspect-square"
                >
                  <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Добавить обложку</p>
                  <p className="text-sm text-gray-500">JPG, PNG до 5MB</p>
                </div>
              ) : (
                <div className="relative aspect-square">
                  <img 
                    src={coverPreview} 
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setCoverPreview(null);
                      if (coverInputRef.current) coverInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverFileChange}
                className="hidden"
              />
            </div>
          </div>
          
          {/* Right Column - Metadata */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Информация о треке</h3>
              
              <div className="space-y-4">
                <Input
                  placeholder="Название трека *"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
                
                <div>
                  <select
                    value={formData.genre}
                    onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-black transition-colors"
                  >
                    <option value="">Выберите жанр</option>
                    {genres.map(genre => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <textarea
                    placeholder="Описание трека"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-black transition-colors resize-none"
                    rows={4}
                  />
                </div>
                
                <Input
                  placeholder="Теги (через запятую)"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Upload Progress */}
        {isUploading && (
          <div className="bg-white border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <LoadingSpinner size="small" />
              <span className="font-medium text-gray-900">Загрузка трека... {uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200">
              <div 
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Success Message */}
        {uploadSuccess && (
          <div className="bg-green-50 border border-green-200 p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700">Трек успешно загружен!</span>
          </div>
        )}
        
        {/* Error Message */}
        {uploadError && (
          <div className="bg-red-50 border border-red-200 p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{uploadError}</span>
          </div>
        )}
        
        {/* Submit Buttons */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={!audioFile || !formData.title.trim() || isUploading}
            loading={isUploading}
            className="flex-1"
          >
            {isUploading ? 'Загрузка...' : 'Загрузить трек'}
          </Button>
          
          <Button
            type="button"
            variant="secondary"
            onClick={resetForm}
            disabled={isUploading}
          >
            Очистить
          </Button>
        </div>
      </form>
      
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        preload="metadata"
      />
    </div>
  );
};

export default Upload;