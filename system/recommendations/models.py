# recommendations/models.py

from django.db import models
from django.utils.translation import gettext_lazy as _
from users.models import User
from tracks.models import Track, Genre

class UserSimilarity(models.Model):
    """
    Хранит информацию о сходстве пользователей для алгоритма коллаборативной фильтрации
    """
    user_a = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='similarities_as_a',
        verbose_name=_('Пользователь A')
    )
    user_b = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='similarities_as_b',
        verbose_name=_('Пользователь B')
    )
    similarity_score = models.FloatField(_('Показатель сходства'))
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user_a', 'user_b')
        verbose_name = _('Сходство пользователей')
        verbose_name_plural = _('Сходства пользователей')
        indexes = [
            models.Index(fields=['user_a', 'similarity_score']),
            models.Index(fields=['user_b', 'similarity_score']),
        ]
    
    def __str__(self):
        return f"Сходство между {self.user_a.username} и {self.user_b.username}: {self.similarity_score}"


class TrackSimilarity(models.Model):
    """
    Хранит информацию о сходстве треков для item-based коллаборативной фильтрации
    """
    track_a = models.ForeignKey(
        Track, 
        on_delete=models.CASCADE, 
        related_name='similarities_as_a',
        verbose_name=_('Трек A')
    )
    track_b = models.ForeignKey(
        Track, 
        on_delete=models.CASCADE, 
        related_name='similarities_as_b',
        verbose_name=_('Трек B')
    )
    similarity_score = models.FloatField(_('Показатель сходства'))
    similarity_type = models.CharField(
        _('Тип сходства'),
        max_length=20,
        choices=[
            ('collaborative', _('Коллаборативное')),
            ('content_based', _('Контентное')),
            ('hybrid', _('Гибридное')),
        ],
        default='collaborative'
    )
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('track_a', 'track_b', 'similarity_type')
        verbose_name = _('Сходство треков')
        verbose_name_plural = _('Сходства треков')
        indexes = [
            models.Index(fields=['track_a', 'similarity_score']),
            models.Index(fields=['track_b', 'similarity_score']),
        ]
    
    def __str__(self):
        return f"Сходство между треками {self.track_a.id} и {self.track_b.id}: {self.similarity_score}"


class UserPreference(models.Model):
    """
    Явные предпочтения пользователя (например, любимые жанры)
    """
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='preferences',
        verbose_name=_('Пользователь')
    )
    genre = models.ForeignKey(
        Genre, 
        on_delete=models.CASCADE, 
        related_name='user_preferences',
        verbose_name=_('Жанр')
    )
    weight = models.FloatField(_('Вес предпочтения'), default=1.0)
    
    class Meta:
        unique_together = ('user', 'genre')
        verbose_name = _('Предпочтение пользователя')
        verbose_name_plural = _('Предпочтения пользователей')
    
    def __str__(self):
        return f"{self.user.username} предпочитает {self.genre.name} с весом {self.weight}"


class UserTrackRecommendation(models.Model):
    """
    Предварительно рассчитанные рекомендации треков для пользователей
    """
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='track_recommendations',
        verbose_name=_('Пользователь')
    )
    track = models.ForeignKey(
        Track, 
        on_delete=models.CASCADE, 
        related_name='recommended_to_users',
        verbose_name=_('Трек')
    )
    score = models.FloatField(_('Оценка рекомендации'))
    recommendation_type = models.CharField(
        _('Тип рекомендации'),
        max_length=20,
        choices=[
            ('collaborative', _('Коллаборативная')),
            ('content_based', _('Контентная')),
            ('popularity', _('По популярности')),
            ('hybrid', _('Гибридная')),
        ],
        default='hybrid'
    )
    
    # Был ли трек показан пользователю
    is_shown = models.BooleanField(_('Был показан'), default=False)
    # Взаимодействовал ли пользователь с треком
    is_interacted = models.BooleanField(_('Было взаимодействие'), default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'track', 'recommendation_type')
        verbose_name = _('Рекомендация трека')
        verbose_name_plural = _('Рекомендации треков')
        indexes = [
            models.Index(fields=['user', 'score']),
            models.Index(fields=['user', 'is_shown', 'score']),
        ]
    
    def __str__(self):
        return f"Рекомендация {self.track.title} для {self.user.username} с оценкой {self.score}"