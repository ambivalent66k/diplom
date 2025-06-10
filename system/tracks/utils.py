import os
import numpy as np
import librosa
import librosa.display
import matplotlib.pyplot as plt
from django.conf import settings
from tempfile import NamedTemporaryFile

def analyze_audio(file_path):
    """
    Анализ аудиофайла и извлечение аудио-характеристик
    
    Args:
        file_path (str): Путь к аудиофайлу
        
    Returns:
        dict: Словарь с аудио-характеристиками
    """
    try:
        # Загрузка аудиофайла
        y, sr = librosa.load(file_path, sr=None)
        
        # Расчет основных характеристик
        # Темп
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        
        # Спектральный центроид
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_centroid_mean = np.mean(spectral_centroids)
        
        # Спектральный контраст
        spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
        spectral_contrast_mean = np.mean(spectral_contrast)
        
        # Мел-частотные кепстральные коэффициенты (MFCC)
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        mfcc_means = np.mean(mfccs, axis=1)
        
        # Спектральный ролл-офф
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        spectral_rolloff_mean = np.mean(spectral_rolloff)
        
        # Хроматограмма
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        chroma_mean = np.mean(chroma, axis=1)
        
        # RMS энергия
        rms = librosa.feature.rms(y=y)[0]
        rms_mean = np.mean(rms)
        
        # Определение тональности
        y_harmonic = librosa.effects.harmonic(y)
        key = librosa.estimate_tuning(y=y_harmonic, sr=sr)
        
        # Создание словаря характеристик
        features = {
            'tempo': float(tempo),
            'spectral_centroid': float(spectral_centroid_mean),
            'spectral_contrast': float(spectral_contrast_mean),
            'spectral_rolloff': float(spectral_rolloff_mean),
            'rms_energy': float(rms_mean),
            'key': float(key),
        }
        
        # Добавляем MFCC коэффициенты
        for i, mfcc in enumerate(mfcc_means):
            features[f'mfcc_{i+1}'] = float(mfcc)
        
        # Добавляем хроматограмму
        for i, chroma_val in enumerate(chroma_mean):
            features[f'chroma_{i+1}'] = float(chroma_val)
        
        return features
    except Exception as e:
        print(f"Ошибка при анализе аудиофайла: {e}")
        return {}


def generate_spectrogram(file_path, save_path=None):
    """
    Генерация спектрограммы для аудиофайла
    
    Args:
        file_path (str): Путь к аудиофайлу
        save_path (str, optional): Путь для сохранения изображения. 
                                 Если None, будет использовано временное имя.
                                 
    Returns:
        str: Путь к сохраненному изображению
    """
    try:
        # Загрузка аудиофайла
        y, sr = librosa.load(file_path, sr=None)
        
        # Создание спектрограммы
        plt.figure(figsize=(10, 4))
        D = librosa.amplitude_to_db(np.abs(librosa.stft(y)), ref=np.max)
        librosa.display.specshow(D, sr=sr, x_axis='time', y_axis='log')
        plt.colorbar(format='%+2.0f dB')
        plt.title('Спектрограмма')
        
        # Сохранение изображения
        if save_path is None:
            # Получаем имя файла без расширения
            file_name = os.path.splitext(os.path.basename(file_path))[0]
            save_path = os.path.join(
                settings.MEDIA_ROOT, 
                'spectrograms', 
                f'{file_name}_spectrogram.png'
            )
            
            # Создаем директорию, если она не существует
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
        
        plt.savefig(save_path)
        plt.close()
        
        # Возвращаем относительный путь для сохранения в базе данных
        return os.path.relpath(save_path, settings.MEDIA_ROOT)
    except Exception as e:
        print(f"Ошибка при создании спектрограммы: {e}")
        return None


def identify_genre_by_audio(file_path):
    """
    Идентификация жанра по аудиофайлу (заглушка - в реальном проекте здесь 
    должна быть модель машинного обучения для определения жанра)
    
    Args:
        file_path (str): Путь к аудиофайлу
        
    Returns:
        list: Список предполагаемых жанров с вероятностями
    """
    # В реальном проекте здесь должна быть модель для классификации жанров
    # Сейчас просто возвращаем случайные вероятности для демонстрации
    
    # Список возможных жанров
    genres = ['pop', 'rock', 'electronic', 'hip-hop', 'classical', 'jazz', 'folk']
    
    # Генерируем случайные вероятности
    probabilities = np.random.dirichlet(np.ones(len(genres)) * 0.5)
    
    # Сортируем жанры по убыванию вероятности
    genre_probs = sorted(zip(genres, probabilities), key=lambda x: x[1], reverse=True)
    
    # Возвращаем результат
    return [{'genre': genre, 'probability': float(prob)} for genre, prob in genre_probs]


def get_duration(file_path):
    """
    Получение длительности аудиофайла в секундах
    
    Args:
        file_path (str): Путь к аудиофайлу
        
    Returns:
        int: Длительность в секундах
    """
    try:
        # Загрузка аудиофайла
        y, sr = librosa.load(file_path, sr=None)
        
        # Расчет длительности
        duration = librosa.get_duration(y=y, sr=sr)
        
        return int(duration)
    except Exception as e:
        print(f"Ошибка при определении длительности аудиофайла: {e}")
        return 0