# users/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    """
    Расширенная модель пользователя с дополнительными полями для музыкальной платформы
    """
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(_('Биография'), max_length=500, blank=True)
    location = models.CharField(_('Местоположение'), max_length=100, blank=True)
    website = models.URLField(_('Веб-сайт'), max_length=200, blank=True)
    
    # Музыкальные предпочтения
    favorite_genres = models.JSONField(_('Любимые жанры'), default=list, blank=True)
    
    # Для статистики и рекомендаций
    listen_count = models.PositiveIntegerField(_('Количество прослушиваний'), default=0)
    
    # Метаданные
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Пользователь')
        verbose_name_plural = _('Пользователи')
    
    def __str__(self):
        return self.username
    
    def get_full_name(self):
        """
        Возвращает full_name или username если full_name не задан
        """
        full_name = super().get_full_name()
        return full_name if full_name else self.username


class UserFollowing(models.Model):
    """
    Модель для отслеживания подписок между пользователями
    """
    user = models.ForeignKey(
        User, 
        related_name='following', 
        on_delete=models.CASCADE
    )
    following_user = models.ForeignKey(
        User, 
        related_name='followers', 
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'following_user')
        verbose_name = _('Подписка')
        verbose_name_plural = _('Подписки')
    
    def __str__(self):
        return f'{self.user.username} подписан на {self.following_user.username}'