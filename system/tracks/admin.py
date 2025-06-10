from django.contrib import admin
from .models import (
    Track, Genre, Playlist, PlaylistTrack, 
    Comment, UserTrackInteraction
)


class PlaylistTrackInline(admin.TabularInline):
    model = PlaylistTrack
    extra = 1
    verbose_name = 'Трек'
    verbose_name_plural = 'Треки'


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 1
    verbose_name = 'Комментарий'
    verbose_name_plural = 'Комментарии'


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ('title', 'artist', 'duration', 'play_count', 'like_count', 'is_published', 'created_at')
    list_filter = ('is_published', 'created_at', 'genres')
    search_fields = ('title', 'description', 'artist__username')
    filter_horizontal = ('genres',)
    readonly_fields = ('play_count', 'like_count', 'duration')
    date_hierarchy = 'created_at'
    
    inlines = [CommentInline]
    
    fieldsets = (
        (None, {
            'fields': ('title', 'artist', 'audio_file', 'cover_image', 'duration')
        }),
        ('Метаданные', {
            'fields': ('genres', 'description', 'release_date', 'is_published')
        }),
        ('Статистика', {
            'fields': ('play_count', 'like_count', 'audio_features'),
            'classes': ('collapse',)
        })
    )


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'is_public', 'created_at')
    list_filter = ('is_public', 'created_at')
    search_fields = ('title', 'description', 'user__username')
    date_hierarchy = 'created_at'
    
    inlines = [PlaylistTrackInline]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('user', 'track', 'text', 'timestamp', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('text', 'user__username', 'track__title')
    date_hierarchy = 'created_at'


@admin.register(UserTrackInteraction)
class UserTrackInteractionAdmin(admin.ModelAdmin):
    list_display = ('user', 'track', 'interaction_type', 'created_at')
    list_filter = ('interaction_type', 'created_at')
    search_fields = ('user__username', 'track__title')
    date_hierarchy = 'created_at'