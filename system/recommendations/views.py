from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserTrackRecommendation, UserPreference
from .serializers import UserTrackRecommendationSerializer, UserPreferenceSerializer, RecommendationResponseSerializer
from .algorithms import RecommendationEngine

from tracks.models import Track, UserTrackInteraction, Genre
from tracks.serializers import TrackSerializer


class RecommendationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API для получения рекомендаций
    """
    queryset = UserTrackRecommendation.objects.all()
    serializer_class = UserTrackRecommendationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Пользователь должен видеть только свои рекомендации
        return UserTrackRecommendation.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def for_you(self, request):
        """
        Получить персонализированные рекомендации для текущего пользователя
        """
        engine = RecommendationEngine()
        recommendations = engine.get_recommendations_for_user(request.user.id, limit=20)
        
        # Отмечаем рекомендации как показанные
        for rec in recommendations:
            engine.mark_recommendation_as_shown(request.user.id, rec['track'].id)
        
        # Получаем только треки для сериализации
        tracks = [rec['track'] for rec in recommendations]
        
        serializer = TrackSerializer(tracks, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """
        Получить рекомендации, сгруппированные по типу (коллаборативные, контентные, популярные)
        """
        # Получаем рекомендации по разным типам
        collaborative_recs = UserTrackRecommendation.objects.filter(
            user=request.user,
            recommendation_type='collaborative'
        ).order_by('-score')[:10]
        
        content_based_recs = UserTrackRecommendation.objects.filter(
            user=request.user,
            recommendation_type='content_based'
        ).order_by('-score')[:10]
        
        popularity_recs = UserTrackRecommendation.objects.filter(
            user=request.user,
            recommendation_type='popularity'
        ).order_by('-score')[:10]
        
        # Если рекомендаций нет, инициируем их создание
        if not collaborative_recs and not content_based_recs and not popularity_recs:
            engine = RecommendationEngine()
            engine.get_recommendations_for_user(request.user.id, limit=30)
            
            # Повторно получаем рекомендации
            collaborative_recs = UserTrackRecommendation.objects.filter(
                user=request.user,
                recommendation_type='collaborative'
            ).order_by('-score')[:10]
            
            content_based_recs = UserTrackRecommendation.objects.filter(
                user=request.user,
                recommendation_type='content_based'
            ).order_by('-score')[:10]
            
            popularity_recs = UserTrackRecommendation.objects.filter(
                user=request.user,
                recommendation_type='popularity'
            ).order_by('-score')[:10]
        
        # Отмечаем рекомендации как показанные
        engine = RecommendationEngine()
        for rec in collaborative_recs:
            engine.mark_recommendation_as_shown(request.user.id, rec.track.id)
        for rec in content_based_recs:
            engine.mark_recommendation_as_shown(request.user.id, rec.track.id)
        for rec in popularity_recs:
            engine.mark_recommendation_as_shown(request.user.id, rec.track.id)
        
        # Сериализуем рекомендации
        collaborative_serializer = TrackSerializer([rec.track for rec in collaborative_recs], many=True, context={'request': request})
        content_based_serializer = TrackSerializer([rec.track for rec in content_based_recs], many=True, context={'request': request})
        popularity_serializer = TrackSerializer([rec.track for rec in popularity_recs], many=True, context={'request': request})
        
        # Формируем ответ
        response_data = {
            'collaborative': collaborative_serializer.data,
            'content_based': content_based_serializer.data,
            'popularity': popularity_serializer.data,
        }
        
        return Response(response_data)
    
    @action(detail=False, methods=['get'])
    def similar_tracks(self, request):
        """
        Получить треки, похожие на те, которые пользователь уже слушал
        """
        # Получаем ID треков, которые пользователь слушал или лайкнул
        user_track_ids = UserTrackInteraction.objects.filter(
            user=request.user,
            interaction_type__in=['play', 'like']
        ).values_list('track_id', flat=True).distinct()
        
        # Получаем треки, похожие на те, которые пользователь слушал
        from .models import TrackSimilarity
        from django.db.models import Q
        
        similar_track_ids = set()
        for track_id in user_track_ids:
            # Находим похожие треки (как по коллаборативной, так и по контентной фильтрации)
            similar_tracks = TrackSimilarity.objects.filter(
                Q(track_a_id=track_id) | Q(track_b_id=track_id)
            ).order_by('-similarity_score')[:5]
            
            for st in similar_tracks:
                # Определяем ID похожего трека
                similar_id = st.track_b_id if st.track_a_id == track_id else st.track_a_id
                
                # Добавляем в множество, если пользователь еще не слушал этот трек
                if similar_id not in user_track_ids:
                    similar_track_ids.add(similar_id)
                
                # Ограничиваем количество похожих треков
                if len(similar_track_ids) >= 20:
                    break
        
        # Получаем объекты треков
        similar_tracks = Track.objects.filter(id__in=similar_track_ids)
        
        # Отмечаем рекомендации как показанные
        engine = RecommendationEngine()
        for track in similar_tracks:
            engine.mark_recommendation_as_shown(request.user.id, track.id)
        
        serializer = TrackSerializer(similar_tracks, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_genre(self, request):
        """
        Получить рекомендации по конкретному жанру
        """
        genre_id = request.query_params.get('genre_id')
        if not genre_id:
            return Response(
                {'detail': 'Необходимо указать ID жанра (genre_id)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Получаем ID треков, которые пользователь уже слушал или лайкнул
        user_track_ids = UserTrackInteraction.objects.filter(
            user=request.user,
            interaction_type__in=['play', 'like']
        ).values_list('track_id', flat=True).distinct()
        
        # Получаем треки указанного жанра, которые пользователь еще не слушал
        from tracks.models import Genre
        try:
            genre = Genre.objects.get(id=genre_id)
            genre_tracks = Track.objects.filter(
                genres=genre,
                is_published=True
            ).exclude(
                id__in=user_track_ids
            ).order_by('-play_count')[:20]
            
            # Отмечаем рекомендации как показанные
            engine = RecommendationEngine()
            for track in genre_tracks:
                engine.mark_recommendation_as_shown(request.user.id, track.id)
            
            serializer = TrackSerializer(genre_tracks, many=True, context={'request': request})
            return Response(serializer.data)
        except Genre.DoesNotExist:
            return Response(
                {'detail': 'Жанр с указанным ID не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def mark_interaction(self, request):
        """
        Отметить взаимодействие с рекомендованным треком
        """
        track_id = request.data.get('track_id')
        interaction_type = request.data.get('interaction_type')
        
        if not track_id or not interaction_type:
            return Response(
                {'detail': 'Необходимо указать ID трека (track_id) и тип взаимодействия (interaction_type)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем существование трека
        try:
            track = Track.objects.get(id=track_id)
        except Track.DoesNotExist:
            return Response(
                {'detail': 'Трек с указанным ID не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Отмечаем рекомендацию как ту, с которой взаимодействовали
        engine = RecommendationEngine()
        engine.mark_recommendation_as_interacted(request.user.id, track.id)
        
        # Создаем запись о взаимодействии
        interaction = UserTrackInteraction.objects.create(
            user=request.user,
            track=track,
            interaction_type=interaction_type
        )
        
        # Обновляем счетчики в треке
        if interaction_type == 'like':
            track.like_count += 1
            track.save(update_fields=['like_count'])
        elif interaction_type == 'play':
            track.play_count += 1
            track.save(update_fields=['play_count'])
        
        return Response({'detail': 'Взаимодействие успешно отмечено'})


class UserPreferenceViewSet(viewsets.ModelViewSet):
    """
    API для работы с предпочтениями пользователя
    """
    queryset = UserPreference.objects.all()
    serializer_class = UserPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Пользователь должен видеть только свои предпочтения
        return UserPreference.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def genres(self, request):
        """
        Получить жанры, отсортированные по предпочтениям пользователя
        """
        # Получаем все жанры
        from tracks.models import Genre
        all_genres = Genre.objects.all()
        
        # Получаем предпочтения пользователя
        user_preferences = UserPreference.objects.filter(user=request.user)
        
        # Создаем словарь с весами жанров
        genre_weights = {pref.genre_id: pref.weight for pref in user_preferences}
        
        # Сортируем жанры по весу (предпочтениям пользователя)
        sorted_genres = sorted(
            all_genres,
            key=lambda genre: genre_weights.get(genre.id, 0),
            reverse=True
        )
        
        from tracks.serializers import GenreSerializer
        serializer = GenreSerializer(sorted_genres, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def set_preferences(self, request):
        """
        Установить предпочтения пользователя по жанрам
        """
        preferences = request.data.get('preferences', [])
        
        if not isinstance(preferences, list):
            return Response(
                {'detail': 'Предпочтения должны быть списком объектов {genre_id, weight}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Удаляем старые предпочтения
        UserPreference.objects.filter(user=request.user).delete()
        
        # Создаем новые предпочтения
        created_preferences = []
        for pref in preferences:
            genre_id = pref.get('genre_id')
            weight = pref.get('weight', 1.0)
            
            try:
                genre = Genre.objects.get(id=genre_id)
                preference = UserPreference.objects.create(
                    user=request.user,
                    genre=genre,
                    weight=weight
                )
                created_preferences.append(preference)
            except Genre.DoesNotExist:
                pass  # Пропускаем несуществующие жанры
        
        serializer = UserPreferenceSerializer(created_preferences, many=True)
        return Response(serializer.data)


class RefreshRecommendationsView(APIView):
    """
    API для обновления рекомендаций
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        engine = RecommendationEngine()
        recommendations = engine.get_recommendations_for_user(request.user.id, limit=30)
        
        if recommendations:
            return Response({
                'detail': 'Рекомендации успешно обновлены',
                'count': len(recommendations)
            })
        else:
            return Response({
                'detail': 'Не удалось сформировать рекомендации. Возможно, у вас недостаточно данных о прослушиваниях.'
            }, status=status.HTTP_400_BAD_REQUEST)