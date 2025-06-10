from django.contrib import admin
from .models import (
    UserTrackRecommendation, UserSimilarity, 
    TrackSimilarity, UserPreference
)


@admin.register(UserTrackRecommendation)
class UserTrackRecommendationAdmin(admin.ModelAdmin):
    list_display = ('user', 'track', 'score', 'recommendation_type', 'is_shown', 'is_interacted', 'created_at')
    list_filter = ('recommendation_type', 'is_shown', 'is_interacted', 'created_at')
    search_fields = ('user__username', 'track__title')
    date_hierarchy = 'created_at'


@admin.register(UserSimilarity)
class UserSimilarityAdmin(admin.ModelAdmin):
    list_display = ('user_a', 'user_b', 'similarity_score', 'last_updated')
    list_filter = ('last_updated',)
    search_fields = ('user_a__username', 'user_b__username')


@admin.register(TrackSimilarity)
class TrackSimilarityAdmin(admin.ModelAdmin):
    list_display = ('track_a', 'track_b', 'similarity_score', 'similarity_type', 'last_updated')
    list_filter = ('similarity_type', 'last_updated')
    search_fields = ('track_a__title', 'track_b__title')


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'genre', 'weight')
    list_filter = ('genre',)
    search_fields = ('user__username', 'genre__name')