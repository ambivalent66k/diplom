# tracks/views.py

from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
# Добавляем импорты для CSRF
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse

from .models import (
    Track, Genre, Playlist, PlaylistTrack, 
    Comment, UserTrackInteraction
)
from .serializers import (
    TrackSerializer, TrackDetailSerializer, TrackCreateUpdateSerializer,
    GenreSerializer, PlaylistSerializer, PlaylistDetailSerializer,
    PlaylistCreateUpdateSerializer, PlaylistTrackSerializer,
    CommentSerializer, UserTrackInteractionSerializer
)
from .permissions import IsOwnerOrReadOnly


class TrackViewSet(viewsets.ModelViewSet):
    """
    API для работы с треками
    """
    queryset = Track.objects.filter(is_published=True)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['artist', 'genres']
    search_fields = ['title', 'description', 'artist__username']
    ordering_fields = ['created_at', 'play_count', 'like_count']
    ordering = ['-created_at']
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Если пользователь аутентифицирован, показываем также его неопубликованные треки
        if self.request.user.is_authenticated:
            queryset = queryset | Track.objects.filter(
                artist=self.request.user, 
                is_published=False
            )
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TrackDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return TrackCreateUpdateSerializer
        return TrackSerializer
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        """
        Лайк трека
        """
        track = self.get_object()
        user = request.user
        
        interaction, created = UserTrackInteraction.objects.get_or_create(
            user=user,
            track=track,
            interaction_type='like'
        )
        
        if created:
            # Увеличиваем счетчик лайков
            track.like_count += 1
            track.save(update_fields=['like_count'])
            return Response({'detail': 'Трек добавлен в избранное'}, status=status.HTTP_201_CREATED)
        else:
            # Если уже существует, удаляем (toggle)
            interaction.delete()
            # Уменьшаем счетчик лайков
            track.like_count = max(0, track.like_count - 1)
            track.save(update_fields=['like_count'])
            return Response({'detail': 'Трек удален из избранного'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def play(self, request, pk=None):
        """
        Зафиксировать прослушивание трека
        """
        track = self.get_object()
        user = request.user
        
        # Получаем дополнительные данные о воспроизведении
        listen_percentage = request.data.get('listen_percentage')
        interaction_data = request.data.get('interaction_data', {})
        
        # Создаем запись о взаимодействии
        UserTrackInteraction.objects.create(
            user=user,
            track=track,
            interaction_type='play',
            listen_percentage=listen_percentage,
            interaction_data=interaction_data
        )
        
        # Увеличиваем счетчик прослушиваний
        track.play_count += 1
        track.save(update_fields=['play_count'])
        
        # Также увеличиваем счетчик прослушиваний в профиле пользователя
        user.listen_count += 1
        user.save(update_fields=['listen_count'])
        
        return Response({'detail': 'Прослушивание зафиксировано'}, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """
        Получение комментариев к треку
        """
        track = self.get_object()
        # Получаем только комментарии первого уровня (не ответы)
        comments = track.comments.filter(parent=None)
        
        page = self.paginate_queryset(comments)
        if page is not None:
            serializer = CommentSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_comment(self, request, pk=None):
        """
        Добавление комментария к треку
        """
        track = self.get_object()
        
        # Подготавливаем данные для сериализатора
        data = request.data.copy()
        data['track'] = track.id
        data['user'] = request.user.id
        
        serializer = CommentSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_tracks(self, request):
        """
        Получение списка треков текущего пользователя
        """
        tracks = Track.objects.filter(artist=request.user)
        
        page = self.paginate_queryset(tracks)
        if page is not None:
            serializer = TrackSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = TrackSerializer(tracks, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def liked_tracks(self, request):
        """
        Получение списка лайкнутых треков текущего пользователя
        """
        liked_track_ids = UserTrackInteraction.objects.filter(
            user=request.user,
            interaction_type='like'
        ).values_list('track_id', flat=True)
        
        tracks = Track.objects.filter(id__in=liked_track_ids)
        
        page = self.paginate_queryset(tracks)
        if page is not None:
            serializer = TrackSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = TrackSerializer(tracks, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def trending(self, request):
        """
        Получение списка популярных треков
        """
        # Здесь можно использовать более сложную логику для определения трендов
        tracks = Track.objects.filter(is_published=True).order_by('-play_count')[:20]
        
        serializer = TrackSerializer(tracks, many=True, context={'request': request})
        return Response(serializer.data)


class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API для работы с жанрами (только чтение)
    """
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class PlaylistViewSet(viewsets.ModelViewSet):
    """
    API для работы с плейлистами
    """
    queryset = Playlist.objects.filter(is_public=True)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['user']
    search_fields = ['title', 'description']
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Если пользователь аутентифицирован, показываем также его приватные плейлисты
        if self.request.user.is_authenticated:
            queryset = queryset | Playlist.objects.filter(
                user=self.request.user, 
                is_public=False
            )
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PlaylistDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return PlaylistCreateUpdateSerializer
        return PlaylistSerializer
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_track(self, request, pk=None):
        """
        Добавление трека в плейлист
        """
        playlist = self.get_object()
        
        # Проверяем, что пользователь является владельцем плейлиста
        if playlist.user != request.user:
            return Response(
                {'detail': 'У вас нет прав для добавления треков в этот плейлист'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Подготавливаем данные для сериализатора
        data = request.data.copy()
        data['playlist'] = playlist.id
        
        # Если порядок не указан, устанавливаем его в конец
        if 'order' not in data:
            last_order = PlaylistTrack.objects.filter(playlist=playlist).aggregate(
                max_order=models.Max('order')
            )['max_order'] or 0
            data['order'] = last_order + 1
        
        serializer = PlaylistTrackSerializer(data=data)
        if serializer.is_valid():
            # Проверяем, что трек еще не добавлен в плейлист
            if PlaylistTrack.objects.filter(
                playlist=playlist, 
                track_id=data['track']
            ).exists():
                return Response(
                    {'detail': 'Этот трек уже добавлен в плейлист'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            playlist_track = serializer.save()
            
            # Фиксируем взаимодействие
            UserTrackInteraction.objects.create(
                user=request.user,
                track_id=data['track'],
                interaction_type='add_to_playlist',
                interaction_data={'playlist_id': playlist.id}
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['delete'], permission_classes=[permissions.IsAuthenticated])
    def remove_track(self, request, pk=None):
        """
        Удаление трека из плейлиста
        """
        playlist = self.get_object()
        
        # Проверяем, что пользователь является владельцем плейлиста
        if playlist.user != request.user:
            return Response(
                {'detail': 'У вас нет прав для удаления треков из этого плейлиста'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        track_id = request.data.get('track')
        if not track_id:
            return Response(
                {'detail': 'ID трека не указан'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            playlist_track = PlaylistTrack.objects.get(
                playlist=playlist, 
                track_id=track_id
            )
            playlist_track.delete()
            
            # Перенумеровываем порядок треков
            for i, pt in enumerate(
                PlaylistTrack.objects.filter(playlist=playlist).order_by('order')
            ):
                pt.order = i + 1
                pt.save(update_fields=['order'])
            
            return Response(
                {'detail': 'Трек успешно удален из плейлиста'},
                status=status.HTTP_200_OK
            )
        except PlaylistTrack.DoesNotExist:
            return Response(
                {'detail': 'Трек не найден в плейлисте'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_playlists(self, request):
        """
        Получение плейлистов текущего пользователя
        """
        playlists = Playlist.objects.filter(user=request.user)
        
        page = self.paginate_queryset(playlists)
        if page is not None:
            serializer = PlaylistSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = PlaylistSerializer(playlists, many=True, context={'request': request})
        return Response(serializer.data)


class CommentViewSet(viewsets.ModelViewSet):
    """
    API для работы с комментариями
    """
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reply(self, request, pk=None):
        """
        Создание ответа на комментарий
        """
        parent_comment = self.get_object()
        
        # Подготавливаем данные для сериализатора
        data = request.data.copy()
        data['parent'] = parent_comment.id
        data['track'] = parent_comment.track.id
        
        serializer = CommentSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserTrackInteractionViewSet(viewsets.ModelViewSet):
    """
    API для работы с взаимодействиями пользователей с треками
    """
    queryset = UserTrackInteraction.objects.all()
    serializer_class = UserTrackInteractionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user', 'track', 'interaction_type']
    
    def get_queryset(self):
        # Пользователь должен видеть только свои взаимодействия
        return UserTrackInteraction.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# Добавляем endpoint для получения CSRF-токена
@ensure_csrf_cookie
def get_csrf_token(request):
    """
    Эндпоинт для установки CSRF-токена в куки
    
    Для использования в React:
    1. Сделайте GET-запрос на этот URL перед отправкой форм
    2. CSRF-токен будет автоматически установлен в cookie браузера
    3. Затем получите токен из cookie для последующих запросов
    """
    return JsonResponse({"detail": "CSRF cookie set"})