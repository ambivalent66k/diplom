import os
import sys
import django
import random
from datetime import timedelta, datetime

# Настройка Django
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'music_recommender.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from tracks.models import Track, Genre, UserTrackInteraction
from users.models import User

def generate_test_data():
    print("Генерация тестовых данных...")
    
    # Создаем жанры
    genres = [
        "Pop", "Rock", "Hip Hop", "Electronic", "Classical", 
        "Jazz", "R&B", "Country", "Metal", "Indie"
    ]
    
    genre_objects = []
    for genre_name in genres:
        genre, created = Genre.objects.get_or_create(name=genre_name)
        genre_objects.append(genre)
        if created:
            print(f"Создан жанр: {genre_name}")
    
    # Создаем тестовых пользователей
    users = []
    for i in range(1, 11):
        username = f"user{i}"
        email = f"user{i}@example.com"
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'is_active': True
            }
        )
        if created:
            user.set_password("password123")
            user.save()
            print(f"Создан пользователь: {username}")
        users.append(user)
    
    # Создаем треки
    tracks = []
    artists = ["Artist1", "Artist2", "Artist3", "Artist4", "Artist5"]
    
    for i in range(1, 51):
        title = f"Track {i}"
        artist_name = random.choice(artists)
        
        track, created = Track.objects.get_or_create(
            title=title,
            defaults={
                'artist_name': artist_name,
                'duration': timedelta(minutes=random.randint(2, 5), seconds=random.randint(0, 59)),
                'release_date': timezone.now() - timedelta(days=random.randint(1, 365)),
                'is_published': True,
                'play_count': random.randint(0, 1000),
                'like_count': random.randint(0, 200)
            }
        )
        
        if created:
            # Добавляем случайные жанры
            track_genres = random.sample(genre_objects, random.randint(1, 3))
            track.genres.set(track_genres)
            
            # Добавляем аудио-характеристики
            track.audio_features = {
                'tempo': random.randint(60, 180),
                'energy': random.random(),
                'danceability': random.random(),
                'valence': random.random(),
                'acousticness': random.random(),
                'instrumentalness': random.random()
            }
            track.save()
            print(f"Создан трек: {title} by {artist_name}")
        
        tracks.append(track)
    
    # Создаем взаимодействия пользователей с треками
    for user in users:
        # Каждый пользователь слушает случайное количество треков
        user_tracks = random.sample(tracks, random.randint(10, 30))
        
        for track in user_tracks:
            # Прослушивания
            play_count = random.randint(1, 10)
            UserTrackInteraction.objects.get_or_create(
                user=user,
                track=track,
                interaction_type='play',
                defaults={'count': play_count}
            )
            
            # Некоторые треки пользователь лайкает
            if random.random() > 0.7:
                UserTrackInteraction.objects.get_or_create(
                    user=user,
                    track=track,
                    interaction_type='like',
                    defaults={'count': 1}
                )
    
    print("Генерация тестовых данных завершена")

if __name__ == "__main__":
    generate_test_data()