from django.db import models
from django.utils.translation import gettext_lazy as _
from users.models import User

class Genre(models.Model):
    """
    Модель для музыкальных жанров
    """
    name = models.CharField(_('Название'), max_length=50, unique=True)
    description = models.TextField(_('Описание'), blank=True)
    
    class Meta:
        verbose_name = _('Жанр')
        verbose_name_plural = _('Жанры')
    
    def __str__(self):
        return self.name


class Track(models.Model):
    """
    Модель для музыкальных треков
    """
    title = models.CharField(_('Название'), max_length=200)
    artist = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='tracks',
        verbose_name=_('Исполнитель')
    )
    
    # Файл трека
    audio_file = models.FileField(_('Аудио файл'), upload_to='tracks/')
    duration = models.PositiveIntegerField(_('Длительность (в секундах)'), default=0)
    
    # Обложка трека
    cover_image = models.ImageField(_('Обложка'), upload_to='covers/', null=True, blank=True)
    
    # Метаданные
    genres = models.ManyToManyField(Genre, verbose_name=_('Жанры'), related_name='tracks', blank=True)
    description = models.TextField(_('Описание'), blank=True)
    release_date = models.DateField(_('Дата выпуска'), null=True, blank=True)
    
    # Для рекомендаций и статистики
    play_count = models.PositiveIntegerField(_('Количество воспроизведений'), default=0)
    like_count = models.PositiveIntegerField(_('Количество лайков'), default=0)
    
    # Аудио характеристики для контентной фильтрации
    audio_features = models.JSONField(_('Аудио характеристики'), null=True, blank=True)
    
    # Статус публикации
    is_published = models.BooleanField(_('Опубликован'), default=True)
    
    # Метаданные
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Трек')
        verbose_name_plural = _('Треки')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.artist.username}"


class Playlist(models.Model):
    """
    Модель для плейлистов
    """
    title = models.CharField(_('Название'), max_length=200)
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='playlists',
        verbose_name=_('Пользователь')
    )
    tracks = models.ManyToManyField(
        Track, 
        through='PlaylistTrack',
        related_name='playlists',
        verbose_name=_('Треки')
    )
    cover_image = models.ImageField(_('Обложка'), upload_to='playlist_covers/', null=True, blank=True)
    description = models.TextField(_('Описание'), blank=True)
    is_public = models.BooleanField(_('Публичный'), default=True)
    
    # Метаданные
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Плейлист')
        verbose_name_plural = _('Плейлисты')
    
    def __str__(self):
        return f"{self.title} ({self.user.username})"


class PlaylistTrack(models.Model):
    """
    Промежуточная модель для треков в плейлисте с порядком
    """
    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE)
    track = models.ForeignKey(Track, on_delete=models.CASCADE)
    order = models.PositiveIntegerField(_('Порядок'), default=0)
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order']
        unique_together = ('playlist', 'track')
        verbose_name = _('Трек в плейлисте')
        verbose_name_plural = _('Треки в плейлисте')


class UserTrackInteraction(models.Model):
    """
    Модель для отслеживания взаимодействия пользователей с треками
    """
    INTERACTION_TYPES = (
        ('play', _('Проигрывание')),
        ('like', _('Лайк')),
        ('dislike', _('Дизлайк')),
        ('skip', _('Пропуск')),
        ('add_to_playlist', _('Добавление в плейлист')),
        ('share', _('Поделиться')),
    )
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='track_interactions',
        verbose_name=_('Пользователь')
    )
    track = models.ForeignKey(
        Track, 
        on_delete=models.CASCADE, 
        related_name='user_interactions',
        verbose_name=_('Трек')
    )
    interaction_type = models.CharField(
        _('Тип взаимодействия'), 
        max_length=20, 
        choices=INTERACTION_TYPES
    )
    # Рейтинг, если применимо (например, для оценки трека)
    rating = models.PositiveSmallIntegerField(_('Рейтинг'), null=True, blank=True)
    
    # Дополнительные данные о взаимодействии
    interaction_data = models.JSONField(_('Данные взаимодействия'), null=True, blank=True)
    
    # Время прослушивания в процентах от общей длительности
    listen_percentage = models.PositiveSmallIntegerField(
        _('Процент прослушивания'), 
        null=True, 
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('Взаимодействие с треком')
        verbose_name_plural = _('Взаимодействия с треками')
        # Индекс для быстрого поиска взаимодействий пользователя
        indexes = [
            models.Index(fields=['user', 'interaction_type']),
            models.Index(fields=['track', 'interaction_type']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.track.title} ({self.interaction_type})"


class Comment(models.Model):
    """
    Модель для комментариев к трекам
    """
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='comments',
        verbose_name=_('Пользователь')
    )
    track = models.ForeignKey(
        Track, 
        on_delete=models.CASCADE, 
        related_name='comments',
        verbose_name=_('Трек')
    )
    text = models.TextField(_('Текст комментария'))
    
    # Положение комментария в треке (в секундах)
    timestamp = models.PositiveIntegerField(_('Временная метка (сек)'), null=True, blank=True)
    
    # Для ответов на комментарии
    parent = models.ForeignKey(
        'self', 
        null=True, 
        blank=True, 
        on_delete=models.CASCADE,
        related_name='replies',
        verbose_name=_('Родительский комментарий')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Комментарий')
        verbose_name_plural = _('Комментарии')
        ordering = ['created_at']
    
    def __str__(self):
        return f"Комментарий от {self.user.username} к треку {self.track.title}"