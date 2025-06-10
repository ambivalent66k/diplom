# tracks/serializers.py

from rest_framework import serializers
from .models import Track, Genre, Playlist, PlaylistTrack, Comment, UserTrackInteraction
from users.serializers import UserSerializer

class GenreSerializer(serializers.ModelSerializer):
    """
    Сериализатор для жанров
    """
    class Meta:
        model = Genre
        fields = ('id', 'name', 'description')


class TrackSerializer(serializers.ModelSerializer):
    """
    Базовый сериализатор для треков
    """
    artist_detail = UserSerializer(source='artist', read_only=True)
    genres_detail = GenreSerializer(source='genres', many=True, read_only=True)
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Track
        fields = (
            'id', 'title', 'artist', 'artist_detail', 'audio_file', 
            'duration', 'cover_image', 'genres', 'genres_detail', 
            'description', 'release_date', 'play_count', 'like_count',
            'is_published', 'created_at', 'updated_at', 'is_liked'
        )
        read_only_fields = ('id', 'play_count', 'like_count', 'created_at', 'updated_at')
    
    def get_is_liked(self, obj):
        """
        Проверяет, лайкнул ли текущий пользователь трек
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return UserTrackInteraction.objects.filter(
                user=request.user,
                track=obj,
                interaction_type='like'
            ).exists()
        return False


class TrackDetailSerializer(TrackSerializer):
    """
    Детальный сериализатор для треков с дополнительной информацией
    """
    comment_count = serializers.SerializerMethodField()
    
    class Meta(TrackSerializer.Meta):
        fields = TrackSerializer.Meta.fields + ('audio_features', 'comment_count')
    
    def get_comment_count(self, obj):
        return obj.comments.count()


class TrackCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для создания и обновления треков
    """
    class Meta:
        model = Track
        fields = (
            'id', 'title', 'audio_file', 'cover_image', 'genres',
            'description', 'release_date', 'is_published'
        )
    
    def create(self, validated_data):
        # Установка текущего пользователя как исполнителя
        validated_data['artist'] = self.context['request'].user
        return super().create(validated_data)


class PlaylistSerializer(serializers.ModelSerializer):
    """
    Сериализатор для плейлистов
    """
    user_detail = UserSerializer(source='user', read_only=True)
    track_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Playlist
        fields = (
            'id', 'title', 'user', 'user_detail', 'cover_image',
            'description', 'is_public', 'created_at', 'updated_at',
            'track_count'
        )
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')
    
    def get_track_count(self, obj):
        return obj.tracks.count()


class PlaylistDetailSerializer(PlaylistSerializer):
    """
    Детальный сериализатор для плейлистов с информацией о треках
    """
    tracks_detail = serializers.SerializerMethodField()
    
    class Meta(PlaylistSerializer.Meta):
        fields = PlaylistSerializer.Meta.fields + ('tracks_detail',)
    
    def get_tracks_detail(self, obj):
        # Получаем информацию о треках с их порядком в плейлисте
        playlist_tracks = PlaylistTrack.objects.filter(playlist=obj).order_by('order')
        result = []
        
        for playlist_track in playlist_tracks:
            track_data = TrackSerializer(
                playlist_track.track, 
                context=self.context
            ).data
            track_data['order'] = playlist_track.order
            track_data['added_at'] = playlist_track.added_at
            result.append(track_data)
        
        return result


class PlaylistCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для создания и обновления плейлистов
    """
    class Meta:
        model = Playlist
        fields = ('id', 'title', 'cover_image', 'description', 'is_public')
        read_only_fields = ('id',)
    
    def create(self, validated_data):
        # Установка текущего пользователя как владельца плейлиста
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class PlaylistTrackSerializer(serializers.ModelSerializer):
    """
    Сериализатор для управления треками в плейлисте
    """
    class Meta:
        model = PlaylistTrack
        fields = ('id', 'playlist', 'track', 'order')
        read_only_fields = ('id',)


class CommentSerializer(serializers.ModelSerializer):
    """
    Сериализатор для комментариев
    """
    user_detail = UserSerializer(source='user', read_only=True)
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = (
            'id', 'user', 'user_detail', 'track', 'text', 'timestamp',
            'parent', 'replies', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')
    
    def get_replies(self, obj):
        """
        Получение ответов на комментарий (только первого уровня)
        """
        if self.context.get('parent_serializer'):
            # Предотвращаем рекурсию
            return []
        
        # Помечаем, что это сериализатор для родительского комментария
        context = self.context.copy()
        context['parent_serializer'] = True
        
        replies = obj.replies.all()
        return CommentSerializer(replies, many=True, context=context).data
    
    def create(self, validated_data):
        # Установка текущего пользователя
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class UserTrackInteractionSerializer(serializers.ModelSerializer):
    """
    Сериализатор для взаимодействий с треками
    """
    class Meta:
        model = UserTrackInteraction
        fields = (
            'id', 'user', 'track', 'interaction_type', 'rating',
            'interaction_data', 'listen_percentage', 'created_at'
        )
        read_only_fields = ('id', 'user', 'created_at')
    
    def create(self, validated_data):
        # Установка текущего пользователя
        validated_data['user'] = self.context['request'].user
        
        # Проверяем, существует ли уже такое взаимодействие
        if validated_data['interaction_type'] in ('like', 'dislike'):
            existing = UserTrackInteraction.objects.filter(
                user=validated_data['user'],
                track=validated_data['track'],
                interaction_type=validated_data['interaction_type']
            ).first()
            
            if existing:
                # Если взаимодействие существует, удаляем его (toggle)
                existing.delete()
                return None
        
        # Обновляем счетчики
        track = validated_data['track']
        if validated_data['interaction_type'] == 'like':
            track.like_count += 1
            track.save(update_fields=['like_count'])
        elif validated_data['interaction_type'] == 'play':
            track.play_count += 1
            track.save(update_fields=['play_count'])
        
        return super().create(validated_data)