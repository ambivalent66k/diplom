# recommendations/serializers.py

from rest_framework import serializers
from .models import UserTrackRecommendation, UserPreference
from tracks.serializers import TrackSerializer
from tracks.models import Track

class UserTrackRecommendationSerializer(serializers.ModelSerializer):
    """
    Сериализатор для рекомендаций треков
    """
    track_detail = TrackSerializer(source='track', read_only=True)
    
    class Meta:
        model = UserTrackRecommendation
        fields = (
            'id', 'user', 'track', 'track_detail', 'score', 
            'recommendation_type', 'is_shown', 'is_interacted', 
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'user', 'track', 'score', 'recommendation_type', 
                           'created_at', 'updated_at')


class UserPreferenceSerializer(serializers.ModelSerializer):
    """
    Сериализатор для предпочтений пользователя
    """
    genre_name = serializers.CharField(source='genre.name', read_only=True)
    
    class Meta:
        model = UserPreference
        fields = ('id', 'user', 'genre', 'genre_name', 'weight')
        read_only_fields = ('id', 'user')
    
    def create(self, validated_data):
        # Установка текущего пользователя
        validated_data['user'] = self.context['request'].user
        
        # Проверяем, существует ли уже такое предпочтение
        existing = UserPreference.objects.filter(
            user=validated_data['user'],
            genre=validated_data['genre']
        ).first()
        
        if existing:
            # Если предпочтение существует, обновляем его
            existing.weight = validated_data['weight']
            existing.save(update_fields=['weight'])
            return existing
        
        return super().create(validated_data)


class RecommendationResponseSerializer(serializers.Serializer):
    """
    Сериализатор для формирования ответа с рекомендациями
    """
    collaborative = serializers.ListField(
        child=TrackSerializer(),
        required=False
    )
    content_based = serializers.ListField(
        child=TrackSerializer(),
        required=False
    )
    popularity = serializers.ListField(
        child=TrackSerializer(),
        required=False
    )
    similar_users = serializers.ListField(
        child=TrackSerializer(),
        required=False
    )
    for_you = serializers.ListField(
        child=TrackSerializer(),
        required=False
    )