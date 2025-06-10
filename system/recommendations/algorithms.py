# recommendations/algorithms.py

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from collections import defaultdict

from django.db import connection
from django.db.models import Count, Avg, Q, F
from django.db import models
from django.conf import settings

from users.models import User
from tracks.models import Track, UserTrackInteraction, Genre
from .models import UserTrackRecommendation, UserSimilarity, TrackSimilarity, UserPreference


class RecommendationEngine:
    """
    Основной класс движка рекомендаций
    """
    
    def __init__(self):
        self.MIN_INTERACTIONS = 3  # Минимальное количество взаимодействий для рекомендаций
        self.MAX_RECOMMENDATIONS = 50  # Максимальное количество рекомендаций
    
    def get_recommendations_for_user(self, user_id, limit=20):
        """
        Получить рекомендации для конкретного пользователя
        """
        user = User.objects.get(id=user_id)
        
        # Проверяем, есть ли у пользователя достаточно взаимодействий
        interactions_count = UserTrackInteraction.objects.filter(
            user=user, 
            interaction_type__in=['play', 'like']
        ).count()
        
        if interactions_count < self.MIN_INTERACTIONS:
            # Если недостаточно данных, используем популярные треки
            return self.get_popular_recommendations(user_id, limit)
        
        # Объединяем рекомендации из разных источников
        recommendations = {}
        
        # 1. Получаем рекомендации на основе коллаборативной фильтрации
        collab_recs = self.get_collaborative_recommendations(user_id, limit)
        for track_id, score in collab_recs.items():
            if track_id not in recommendations:
                recommendations[track_id] = {'score': 0, 'sources': []}
            recommendations[track_id]['score'] += score * 0.5  # Вес коллаборативных рекомендаций
            recommendations[track_id]['sources'].append('collaborative')
        
        # 2. Получаем рекомендации на основе контентной фильтрации
        content_recs = self.get_content_based_recommendations(user_id, limit)
        for track_id, score in content_recs.items():
            if track_id not in recommendations:
                recommendations[track_id] = {'score': 0, 'sources': []}
            recommendations[track_id]['score'] += score * 0.3  # Вес контентных рекомендаций
            recommendations[track_id]['sources'].append('content_based')
        
        # 3. Добавляем популярные треки с меньшим весом
        popular_recs = self.get_popular_recommendations(user_id, limit)
        for track_id, score in popular_recs.items():
            if track_id not in recommendations:
                recommendations[track_id] = {'score': 0, 'sources': []}
            recommendations[track_id]['score'] += score * 0.2  # Вес популярных рекомендаций
            recommendations[track_id]['sources'].append('popularity')
        
        # Сортируем треки по весу и возвращаем топ limit
        sorted_recommendations = sorted(
            recommendations.items(), 
            key=lambda x: x[1]['score'], 
            reverse=True
        )[:limit]
        
        # Получаем объекты треков
        track_ids = [track_id for track_id, _ in sorted_recommendations]
        tracks = Track.objects.filter(id__in=track_ids)
        
        # Создаем словарь с треками
        track_dict = {track.id: track for track in tracks}
        
        # Формируем результат
        result = []
        for track_id, rec_data in sorted_recommendations:
            if track_id in track_dict:
                result.append({
                    'track': track_dict[track_id],
                    'score': rec_data['score'],
                    'sources': rec_data['sources']
                })
        
        # Сохраняем рекомендации в базу
        self.save_recommendations(user_id, result)
        
        return result
    
    def get_collaborative_recommendations(self, user_id, limit=20):
        """
        Получить рекомендации на основе коллаборативной фильтрации
        """
        # 1. Получаем треки, которые пользователь уже лайкнул или прослушал
        user_interaction_track_ids = UserTrackInteraction.objects.filter(
            user_id=user_id, 
            interaction_type__in=['play', 'like']
        ).values_list('track_id', flat=True).distinct()
        
        # 2. Находим похожих пользователей
        similar_users = UserSimilarity.objects.filter(
            user_a_id=user_id
        ).order_by('-similarity_score')[:50]
        
        # Словарь для хранения рекомендаций {track_id: score}
        recommendations = defaultdict(float)
        
        # 3. Проходим по похожим пользователям и собираем их лайкнутые/прослушанные треки
        for user_similarity in similar_users:
            similar_user_id = user_similarity.user_b_id
            similarity_score = user_similarity.similarity_score
            
            # Находим все треки, которые послушал/лайкнул похожий пользователь
            similar_user_interactions = UserTrackInteraction.objects.filter(
    user_id=similar_user_id,
    interaction_type__in=['play', 'like']
).exclude(track_id__in=user_interaction_track_ids)
            
            
            # Добавляем треки в рекомендации
            for interaction in similar_user_interactions:
                track_id = interaction.track_id
                
                # Вес взаимодействия
                interaction_weight = 1.0
                if interaction.interaction_type == 'like':
                    interaction_weight = 2.0  # Лайк имеет больший вес
                
                # Добавляем вес трека в рекомендации
                recommendations[track_id] += similarity_score * interaction_weight
        
        # Нормализуем оценки от 0 до 1
        if recommendations:
            max_score = max(recommendations.values())
            if max_score > 0:
                for track_id in recommendations:
                    recommendations[track_id] /= max_score
        
        # Возвращаем топ треков
        return dict(sorted(
            recommendations.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:limit])
    
    def get_content_based_recommendations(self, user_id, limit=20):
        """
        Получить рекомендации на основе контентной фильтрации (по жанрам и аудио-характеристикам)
        """
        # 1. Находим любимые жанры пользователя
        user_genres = {}
        
        # Получаем явные предпочтения пользователя (жанры)
        explicit_preferences = UserPreference.objects.filter(user_id=user_id)
        for pref in explicit_preferences:
            user_genres[pref.genre_id] = pref.weight
        
        # Если явных предпочтений нет, определяем их на основе прослушиваний
        if not user_genres:
            # Получаем все взаимодействия пользователя
            user_interactions = UserTrackInteraction.objects.filter(
                user_id=user_id,
                interaction_type__in=['play', 'like']
            )
            
            # Собираем ID треков, с которыми взаимодействовал пользователь
            track_ids = user_interactions.values_list('track_id', flat=True).distinct()
            
            # Получаем все жанры этих треков и считаем их частоту
            genre_counts = {}
            for track in Track.objects.filter(id__in=track_ids).prefetch_related('genres'):
                for genre in track.genres.all():
                    genre_counts[genre.id] = genre_counts.get(genre.id, 0) + 1
            
            # Нормализуем частоты для получения весов
            if genre_counts:
                max_count = max(genre_counts.values())
                for genre_id, count in genre_counts.items():
                    user_genres[genre_id] = count / max_count
        
        # 2. Получаем треки, которые пользователь уже слушал или лайкнул
        user_interaction_track_ids = UserTrackInteraction.objects.filter(
            user_id=user_id, 
            interaction_type__in=['play', 'like']
        ).values_list('track_id', flat=True).distinct()
        
        # 3. Ищем треки с похожими жанрами, которые пользователь еще не слушал
        recommendations = defaultdict(float)
        
        # Получаем все треки, которые пользователь еще не слушал
        all_tracks = Track.objects.filter(
            is_published=True
        ).exclude(
            id__in=user_interaction_track_ids
        ).prefetch_related('genres')
        
        # Для каждого трека вычисляем его релевантность на основе жанров
        for track in all_tracks:
            track_genres = list(track.genres.all())
            
            # Если у трека нет жанров, пропускаем его
            if not track_genres:
                continue
            
            # Вычисляем релевантность трека
            relevance = 0
            for genre in track_genres:
                genre_weight = user_genres.get(genre.id, 0)
                relevance += genre_weight
            
            # Нормализуем релевантность по количеству жанров трека
            if track_genres:
                relevance /= len(track_genres)
            
            # Добавляем релевантность трека в рекомендации
            recommendations[track.id] = relevance
        
        # Нормализуем оценки от 0 до 1
        if recommendations:
            max_score = max(recommendations.values())
            if max_score > 0:
                for track_id in recommendations:
                    recommendations[track_id] /= max_score
        
        # Возвращаем топ треков
        return dict(sorted(
            recommendations.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:limit])
    
    def get_popular_recommendations(self, user_id, limit=20):
        """
        Получить рекомендации на основе популярности треков
        """
        # Получаем треки, которые пользователь уже слушал или лайкнул
        user_interaction_track_ids = UserTrackInteraction.objects.filter(
            user_id=user_id, 
            interaction_type__in=['play', 'like']
        ).values_list('track_id', flat=True).distinct()
        
        # Получаем популярные треки, которые пользователь еще не слушал
        popular_tracks = Track.objects.filter(
            is_published=True
        ).exclude(
            id__in=user_interaction_track_ids
        ).order_by('-play_count', '-like_count')[:limit]
        
        # Формируем рекомендации
        recommendations = {}
        
        # Если есть популярные треки, нормализуем их оценки
        max_plays = Track.objects.aggregate(max_plays=models.Max('play_count'))['max_plays'] or 1
        
        for idx, track in enumerate(popular_tracks):
            # Нормализуем популярность от 0 до 1
            popularity = (track.play_count / max_plays) + (limit - idx) / (limit * 10)
            popularity = min(1.0, popularity)  # Ограничиваем максимальным значением 1.0
            
            recommendations[track.id] = popularity
        
        return recommendations
    
    def save_recommendations(self, user_id, recommendations):
        """
        Сохранить рекомендации в базу данных
        """
        # Преобразуем рекомендации в формат для сохранения
        recommendations_to_save = []
        for rec in recommendations:
            track = rec['track']
            score = rec['score']
            sources = rec['sources']
            
            # Определяем тип рекомендации
            if len(sources) > 1:
                recommendation_type = 'hybrid'
            else:
                recommendation_type = sources[0]
            
            # Создаем объект рекомендации
            recommendations_to_save.append(
                UserTrackRecommendation(
                    user_id=user_id,
                    track=track,
                    score=score,
                    recommendation_type=recommendation_type,
                    is_shown=False,
                    is_interacted=False
                )
            )
        
        # Удаляем старые рекомендации для этого пользователя
        UserTrackRecommendation.objects.filter(user_id=user_id).delete()
        
        # Сохраняем новые рекомендации
        if recommendations_to_save:
            UserTrackRecommendation.objects.bulk_create(recommendations_to_save)
    
    def mark_recommendation_as_shown(self, user_id, track_id):
        """
        Пометить рекомендацию как показанную пользователю
        """
        try:
            rec = UserTrackRecommendation.objects.get(user_id=user_id, track_id=track_id)
            rec.is_shown = True
            rec.save(update_fields=['is_shown'])
            return True
        except UserTrackRecommendation.DoesNotExist:
            return False
    
    def mark_recommendation_as_interacted(self, user_id, track_id):
        """
        Пометить рекомендацию как ту, с которой пользователь взаимодействовал
        """
        try:
            rec = UserTrackRecommendation.objects.get(user_id=user_id, track_id=track_id)
            rec.is_interacted = True
            rec.save(update_fields=['is_interacted'])
            return True
        except UserTrackRecommendation.DoesNotExist:
            return False


class CollaborativeFilteringEngine:
    """
    Движок коллаборативной фильтрации для обновления сходства между пользователями и треками
    """
    
    def __init__(self):
        self.MIN_INTERACTIONS = 5  # Минимальное количество взаимодействий для расчета сходства
    
    def update_user_similarities(self):
        """
        Обновить матрицу сходства между пользователями
        """
        # 1. Получаем все взаимодействия пользователей с треками
        interactions = UserTrackInteraction.objects.filter(
            interaction_type__in=['play', 'like']
        ).values('user_id', 'track_id', 'interaction_type')
        
        # 2. Преобразуем в DataFrame
        df = pd.DataFrame(list(interactions))
        
        # Если нет данных, завершаем
        if df.empty:
            return
        
        # 3. Создаем вес для взаимодействий (лайк имеет больший вес, чем прослушивание)
        df['weight'] = df['interaction_type'].apply(lambda x: 2.0 if x == 'like' else 1.0)
        
        # 4. Создаем сводную таблицу: users x tracks
        user_item_matrix = df.pivot_table(
            index='user_id', 
            columns='track_id', 
            values='weight', 
            aggfunc='sum', 
            fill_value=0
        )
        
        # 5. Фильтруем пользователей с недостаточным количеством взаимодействий
        user_interaction_counts = user_item_matrix.astype(bool).sum(axis=1)
        active_users = user_interaction_counts[user_interaction_counts >= self.MIN_INTERACTIONS].index
        user_item_matrix = user_item_matrix.loc[active_users]
        
        # Если нет активных пользователей, завершаем
        if len(active_users) == 0:
            return
        
        # 6. Вычисляем матрицу косинусного сходства между пользователями
        user_similarity = cosine_similarity(user_item_matrix)
        
        # 7. Создаем DataFrame сходства
        user_similarity_df = pd.DataFrame(
            user_similarity, 
            index=user_item_matrix.index, 
            columns=user_item_matrix.index
        )
        
        # 8. Подготавливаем данные для сохранения в базу
        similarity_records = []
        
        # Очищаем старые записи
        UserSimilarity.objects.all().delete()
        
        # Создаем новые записи
        for user_a in user_similarity_df.index:
            for user_b in user_similarity_df.columns:
                if user_a != user_b:  # Исключаем сходство пользователя с самим собой
                    similarity = user_similarity_df.loc[user_a, user_b]
                    if similarity > 0:  # Сохраняем только положительное сходство
                        similarity_records.append(
                            UserSimilarity(
                                user_a_id=user_a,
                                user_b_id=user_b,
                                similarity_score=similarity
                            )
                        )
        
        # 9. Сохраняем записи пакетами
        if similarity_records:
            batch_size = 1000
            for i in range(0, len(similarity_records), batch_size):
                UserSimilarity.objects.bulk_create(
                    similarity_records[i:i + batch_size]
                )
    
    def update_track_similarities(self):
        """
        Обновить матрицу сходства между треками (item-based коллаборативная фильтрация)
        """
        # 1. Получаем все взаимодействия пользователей с треками
        interactions = UserTrackInteraction.objects.filter(
            interaction_type__in=['play', 'like']
        ).values('user_id', 'track_id', 'interaction_type')
        
        # 2. Преобразуем в DataFrame
        df = pd.DataFrame(list(interactions))
        
        # Если нет данных, завершаем
        if df.empty:
            return
        
        # 3. Создаем вес для взаимодействий (лайк имеет больший вес, чем прослушивание)
        df['weight'] = df['interaction_type'].apply(lambda x: 2.0 if x == 'like' else 1.0)
        
        # 4. Создаем сводную таблицу: users x tracks
        user_item_matrix = df.pivot_table(
            index='user_id', 
            columns='track_id', 
            values='weight', 
            aggfunc='sum', 
            fill_value=0
        )
        
        # 5. Фильтруем треки с недостаточным количеством взаимодействий
        track_interaction_counts = user_item_matrix.astype(bool).sum(axis=0)
        active_tracks = track_interaction_counts[track_interaction_counts >= self.MIN_INTERACTIONS].index
        user_item_matrix = user_item_matrix[active_tracks]
        
        # Если нет активных треков, завершаем
        if len(active_tracks) == 0:
            return
        
        # 6. Вычисляем матрицу косинусного сходства между треками
        track_similarity = cosine_similarity(user_item_matrix.T)
        
        # 7. Создаем DataFrame сходства
        track_similarity_df = pd.DataFrame(
            track_similarity, 
            index=active_tracks, 
            columns=active_tracks
        )
        
        # 8. Подготавливаем данные для сохранения в базу
        similarity_records = []
        
        # Очищаем старые записи
        TrackSimilarity.objects.filter(similarity_type='collaborative').delete()
        
        # Создаем новые записи
        for track_a in track_similarity_df.index:
            for track_b in track_similarity_df.columns:
                if track_a != track_b:  # Исключаем сходство трека с самим собой
                    similarity = track_similarity_df.loc[track_a, track_b]
                    if similarity > 0:  # Сохраняем только положительное сходство
                        similarity_records.append(
                            TrackSimilarity(
                                track_a_id=track_a,
                                track_b_id=track_b,
                                similarity_score=similarity,
                                similarity_type='collaborative'
                            )
                        )
        
        # 9. Сохраняем записи пакетами
        if similarity_records:
            batch_size = 1000
            for i in range(0, len(similarity_records), batch_size):
                TrackSimilarity.objects.bulk_create(
                    similarity_records[i:i + batch_size]
                )


class ContentBasedFilteringEngine:
    """
    Движок контентной фильтрации для обновления сходства между треками на основе их содержания
    """
    
    def update_track_content_similarities(self):
        """
        Обновить матрицу сходства между треками на основе их содержания (жанров и аудио-характеристик)
        """
        # 1. Получаем все треки с их жанрами
        tracks = Track.objects.filter(is_published=True).prefetch_related('genres')
        
        if not tracks:
            return
        
        # 2. Создаем DataFrame жанров для треков (one-hot encoding)
        genres = Genre.objects.all()
        genre_map = {genre.id: idx for idx, genre in enumerate(genres)}
        
        # Создаем матрицу треков и жанров
        track_genre_matrix = np.zeros((len(tracks), len(genres)))
        track_ids = []
        
        for idx, track in enumerate(tracks):
            track_ids.append(track.id)
            for genre in track.genres.all():
                if genre.id in genre_map:
                    track_genre_matrix[idx, genre_map[genre.id]] = 1
        
        # 3. Добавляем аудио-характеристики, если они есть
        audio_features = []
        audio_feature_names = set()
        
        for track in tracks:
            if track.audio_features:
                for feature_name in track.audio_features.keys():
                    audio_feature_names.add(feature_name)
        
        audio_feature_names = sorted(audio_feature_names)
        audio_feature_map = {name: idx for idx, name in enumerate(audio_feature_names)}
        
        if audio_feature_names:
            audio_feature_matrix = np.zeros((len(tracks), len(audio_feature_names)))
            
            for idx, track in enumerate(tracks):
                if track.audio_features:
                    for feature_name, value in track.audio_features.items():
                        if feature_name in audio_feature_map:
                            try:
                                audio_feature_matrix[idx, audio_feature_map[feature_name]] = float(value)
                            except (ValueError, TypeError):
                                pass
            
            # Нормализуем аудио-характеристики
            feature_max = np.max(audio_feature_matrix, axis=0)
            feature_max[feature_max == 0] = 1  # Избегаем деления на ноль
            audio_feature_matrix = audio_feature_matrix / feature_max
            
            # Объединяем матрицы жанров и аудио-характеристик
            combined_matrix = np.hstack((track_genre_matrix, audio_feature_matrix))
        else:
            combined_matrix = track_genre_matrix
        
        # 4. Вычисляем матрицу косинусного сходства между треками
        track_similarity = cosine_similarity(combined_matrix)
        
        # 5. Создаем DataFrame сходства
        track_similarity_df = pd.DataFrame(
            track_similarity, 
            index=track_ids, 
            columns=track_ids
        )
        
        # 6. Подготавливаем данные для сохранения в базу
        similarity_records = []
        
        # Очищаем старые записи
        TrackSimilarity.objects.filter(similarity_type='content_based').delete()
        
        # Создаем новые записи
        for track_a in track_ids:
            for track_b in track_ids:
                if track_a != track_b:  # Исключаем сходство трека с самим собой
                    similarity = track_similarity_df.loc[track_a, track_b]
                    if similarity > 0:  # Сохраняем только положительное сходство
                        similarity_records.append(
                            TrackSimilarity(
                                track_a_id=track_a,
                                track_b_id=track_b,
                                similarity_score=similarity,
                                similarity_type='content_based'
                            )
                        )
        
        # 7. Сохраняем записи пакетами
        if similarity_records:
            batch_size = 1000
            for i in range(0, len(similarity_records), batch_size):
                TrackSimilarity.objects.bulk_create(
                    similarity_records[i:i + batch_size]
                )