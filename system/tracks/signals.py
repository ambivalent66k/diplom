# tracks/signals.py

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Track, UserTrackInteraction
from .utils import analyze_audio, get_duration
import os


@receiver(post_save, sender=Track)
def process_track_file(sender, instance, created, **kwargs):
    """
    Обрабатывает файл трека после сохранения
    """
    if created or not instance.audio_features:
        # Проверяем, существует ли файл
        if instance.audio_file and os.path.exists(instance.audio_file.path):
            # Если у трека нет длительности, вычисляем ее
            if not instance.duration:
                instance.duration = get_duration(instance.audio_file.path)
                Track.objects.filter(id=instance.id).update(duration=instance.duration)
            
            # Если у трека нет аудио-характеристик, извлекаем их
            if not instance.audio_features:
                audio_features = analyze_audio(instance.audio_file.path)
                Track.objects.filter(id=instance.id).update(audio_features=audio_features)


@receiver(post_save, sender=UserTrackInteraction)
def update_track_counters(sender, instance, created, **kwargs):
    """
    Обновляет счетчики трека при создании взаимодействия
    """
    if created:
        track = instance.track
        
        # Увеличиваем счетчик прослушиваний
        if instance.interaction_type == 'play':
            Track.objects.filter(id=track.id).update(play_count=track.play_count + 1)
        
        # Увеличиваем счетчик лайков
        elif instance.interaction_type == 'like':
            Track.objects.filter(id=track.id).update(like_count=track.like_count + 1)
        
        # Уменьшаем счетчик лайков при дизлайке (если был лайк)
        elif instance.interaction_type == 'dislike':
            # Проверяем, был ли ранее лайк
            like_exists = UserTrackInteraction.objects.filter(
                user=instance.user,
                track=track,
                interaction_type='like'
            ).exists()
            
            if like_exists:
                # Удаляем лайк
                UserTrackInteraction.objects.filter(
                    user=instance.user,
                    track=track,
                    interaction_type='like'
                ).delete()
                
                # Уменьшаем счетчик лайков
                Track.objects.filter(id=track.id).update(like_count=max(0, track.like_count - 1))


@receiver(post_delete, sender=UserTrackInteraction)
def remove_track_interaction(sender, instance, **kwargs):
    """
    Обновляет счетчики трека при удалении взаимодействия
    """
    track = instance.track
    
    # Уменьшаем счетчик лайков
    if instance.interaction_type == 'like':
        Track.objects.filter(id=track.id).update(like_count=max(0, track.like_count - 1))


# users/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import User
from rest_framework.authtoken.models import Token


@receiver(post_save, sender=User)
def create_auth_token(sender, instance=None, created=False, **kwargs):
    """
    Создает токен для нового пользователя
    """
    if created:
        Token.objects.create(user=instance)


# Настройка для загрузки сигналов при запуске приложения

# tracks/apps.py
from django.apps import AppConfig

class TracksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tracks'
    
    def ready(self):
        import tracks.signals


# users/apps.py
from django.apps import AppConfig

class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'
    
    def ready(self):
        import users.signals