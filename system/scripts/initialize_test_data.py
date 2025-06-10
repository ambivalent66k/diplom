import os
import sys
import django
import random
from datetime import datetime, timedelta
from django.utils import timezone

project_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'music_recommender.settings')
django.setup()
# Настройка переменных окружения для Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'music_recommender.settings')
django.setup()

from django.contrib.auth import get_user_model
from tracks.models import Genre, Track, Playlist, PlaylistTrack, Comment, UserTrackInteraction
from recommendations.models import UserPreference

User = get_user_model()


def create_test_users(count=10):
    """Создать тестовых пользователей"""
    print(f"Создание {count} тестовых пользователей...")
    
    users = []
    for i in range(1, count + 1):
        username = f"user{i}"
        email = f"user{i}@example.com"
        
        # Проверяем, существует ли пользователь
        if User.objects.filter(username=username).exists():
            print(f"Пользователь {username} уже существует")
            users.append(User.objects.get(username=username))
            continue
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password="password123",
            first_name=f"First{i}",
            last_name=f"Last{i}"
        )
        users.append(user)
        print(f"Создан пользователь {username}")
    
    return users


def create_genres():
    """Создать музыкальные жанры"""
    print("Создание музыкальных жанров...")
    
    genres = [
        "Pop", "Rock", "Hip Hop", "R&B", "Electronic",
        "Classical", "Jazz", "Country", "Folk", "Metal",
        "Blues", "Reggae", "Punk", "Funk", "Soul"
    ]
    
    genre_objects = []
    for genre_name in genres:
        genre, created = Genre.objects.get_or_create(name=genre_name)
        genre_objects.append(genre)
        
        if created:
            print(f"Создан жанр {genre_name}")
        else:
            print(f"Жанр {genre_name} уже существует")
    
    return genre_objects


def create_tracks(users, genres, count=30):
    """Создать треки для пользователей"""
    print(f"Создание {count} тестовых треков...")
    
    tracks = []
    for i in range(1, count + 1):
        title = f"Track {i}"
        
        # Проверяем, существует ли трек с таким названием
        if Track.objects.filter(title=title).exists():
            print(f"Трек {title} уже существует")
            tracks.append(Track.objects.get(title=title))
            continue
        
        # Случайно выбираем пользователя и жанры
        artist = random.choice(users)
        track_genres = random.sample(genres, random.randint(1, 3))
        
        # Создаем трек
        track = Track.objects.create(
            title=title,
            artist=artist,
            description=f"Description for track {i}",
            duration=random.randint(120, 360),  # Длительность от 2 до 6 минут
            play_count=random.randint(0, 1000),
            like_count=random.randint(0, 200),
            is_published=True,
            release_date=timezone.now().date() - timedelta(days=random.randint(0, 365))
        )
        
        # Добавляем жанры
        track.genres.set(track_genres)
        
        # Добавляем аудио-характеристики (заглушка)
        track.audio_features = {
            'tempo': random.uniform(60, 180),
            'spectral_centroid': random.uniform(500, 2000),
            'spectral_contrast': random.uniform(0, 10),
            'spectral_rolloff': random.uniform(500, 5000),
            'rms_energy': random.uniform(0.1, 0.9),
            'key': random.uniform(0, 11)
        }
        track.save()
        
        tracks.append(track)
        print(f"Создан трек {title} для пользователя {artist.username}")
    
    return tracks


def create_playlists(users, tracks, count=15):
    """Создать плейлисты для пользователей"""
    print(f"Создание {count} тестовых плейлистов...")
    
    playlists = []
    for i in range(1, count + 1):
        title = f"Playlist {i}"
        
        # Проверяем, существует ли плейлист с таким названием
        if Playlist.objects.filter(title=title).exists():
            print(f"Плейлист {title} уже существует")
            playlists.append(Playlist.objects.get(title=title))
            continue
        
        # Случайно выбираем пользователя
        user = random.choice(users)
        
        # Создаем плейлист
        playlist = Playlist.objects.create(
            title=title,
            user=user,
            description=f"Description for playlist {i}",
            is_public=random.choice([True, True, False])  # 2/3 вероятность публичного плейлиста
        )
        
        # Добавляем треки в плейлист
        playlist_tracks = random.sample(tracks, random.randint(5, 15))
        for order, track in enumerate(playlist_tracks, start=1):
            PlaylistTrack.objects.create(
                playlist=playlist,
                track=track,
                order=order
            )
        
        playlists.append(playlist)
        print(f"Создан плейлист {title} для пользователя {user.username} с {len(playlist_tracks)} треками")
    
    return playlists


def create_interactions(users, tracks, count_per_user=30):
    """Создать взаимодействия пользователей с треками"""
    print(f"Создание взаимодействий пользователей с треками (примерно {len(users) * count_per_user})...")
    
    interactions = []
    for user in users:
        # Выбираем случайные треки для взаимодействия
        user_track_interactions = random.sample(tracks, min(count_per_user, len(tracks)))
        
        for track in user_track_interactions:
            # Тип взаимодействия (play, like, dislike, skip)
            interaction_type = random.choice(['play', 'play', 'play', 'like', 'dislike', 'skip'])
            
            # Проверяем, существует ли уже такое взаимодействие
            if UserTrackInteraction.objects.filter(
                user=user, 
                track=track, 
                interaction_type=interaction_type
            ).exists():
                print(f"Взаимодействие {interaction_type} для {user.username} с треком {track.title} уже существует")
                continue
            
            # Создаем взаимодействие
            interaction = UserTrackInteraction.objects.create(
                user=user,
                track=track,
                interaction_type=interaction_type,
                listen_percentage=random.randint(1, 100) if interaction_type == 'play' else None
            )
            
            interactions.append(interaction)
            print(f"Создано взаимодействие {interaction_type} для {user.username} с треком {track.title}")
    
    return interactions


def create_comments(users, tracks, count=50):
    """Создать комментарии к трекам"""
    print(f"Создание {count} тестовых комментариев...")
    
    comments = []
    for i in range(1, count + 1):
        # Случайно выбираем пользователя и трек
        user = random.choice(users)
        track = random.choice(tracks)
        
        # Случайно выбираем, будет ли это ответ на другой комментарий
        is_reply = random.choice([False, False, False, True])  # 1/4 вероятность ответа
        
        parent = None
        if is_reply:
            # Получаем существующие комментарии к треку
            existing_comments = Comment.objects.filter(track=track, parent=None)
            if existing_comments.exists():
                parent = random.choice(existing_comments)
        
        # Создаем комментарий
        comment = Comment.objects.create(
            user=user,
            track=track,
            text=f"Comment {i} {'- это ответ' if parent else ''}",
            timestamp=random.randint(0, track.duration) if random.choice([True, False]) else None,
            parent=parent
        )
        
        comments.append(comment)
        print(f"Создан комментарий от {user.username} к треку {track.title}")
    
    return comments


def create_user_preferences(users, genres):
    """Создать предпочтения пользователей по жанрам"""
    print(f"Создание предпочтений для {len(users)} пользователей...")
    
    preferences = []
    for user in users:
        # Случайно выбираем жанры для предпочтений
        user_genres = random.sample(genres, random.randint(2, 5))
        
        for genre in user_genres:
            # Проверяем, существует ли уже такое предпочтение
            if UserPreference.objects.filter(user=user, genre=genre).exists():
                print(f"Предпочтение жанра {genre.name} для {user.username} уже существует")
                continue
            
            # Создаем предпочтение с случайным весом
            weight = random.uniform(0.5, 1.0)
            preference = UserPreference.objects.create(
                user=user,
                genre=genre,
                weight=weight
            )
            
            preferences.append(preference)
            print(f"Создано предпочтение жанра {genre.name} (вес {weight:.2f}) для {user.username}")
    
    return preferences


def create_followings(users, max_per_user=5):
    """Создать подписки между пользователями"""
    print(f"Создание подписок между пользователями...")
    
    from users.models import UserFollowing
    
    followings = []
    for user in users:
        # Определяем, на скольких пользователей подпишется текущий пользователь
        follow_count = random.randint(0, min(max_per_user, len(users) - 1))
        
        # Выбираем случайных пользователей для подписки
        potential_followings = [u for u in users if u != user]
        if follow_count > 0:
            users_to_follow = random.sample(potential_followings, follow_count)
            
            for following_user in users_to_follow:
                # Проверяем, существует ли уже такая подписка
                if UserFollowing.objects.filter(user=user, following_user=following_user).exists():
                    print(f"Подписка {user.username} на {following_user.username} уже существует")
                    continue
                
                # Создаем подписку
                following = UserFollowing.objects.create(
                    user=user,
                    following_user=following_user
                )
                
                followings.append(following)
                print(f"Создана подписка {user.username} на {following_user.username}")
    
    return followings


def main():
    """Основная функция для инициализации тестовых данных"""
    print("Начало инициализации тестовых данных...")
    
    # Создаем тестовых пользователей
    users = create_test_users(count=10)
    
    # Создаем жанры
    genres = create_genres()
    
    # Создаем треки
    tracks = create_tracks(users, genres, count=30)
    
    # Создаем плейлисты
    playlists = create_playlists(users, tracks, count=15)
    
    # Создаем взаимодействия
    interactions = create_interactions(users, tracks, count_per_user=30)
    
    # Создаем комментарии
    comments = create_comments(users, tracks, count=50)
    
    # Создаем предпочтения пользователей
    preferences = create_user_preferences(users, genres)
    
    # Создаем подписки
    followings = create_followings(users, max_per_user=5)
    
    print("Инициализация тестовых данных завершена!")


if __name__ == "__main__":
    main()