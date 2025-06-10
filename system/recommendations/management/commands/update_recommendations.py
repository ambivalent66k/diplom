from django.core.management.base import BaseCommand
from recommendations.algorithms import (
    RecommendationEngine, 
    CollaborativeFilteringEngine, 
    ContentBasedFilteringEngine
)
from users.models import User
import time


class Command(BaseCommand):
    help = 'Обновляет рекомендации для всех пользователей или для конкретного пользователя'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--user_id',
            type=int,
            help='ID пользователя для обновления рекомендаций'
        )
        parser.add_argument(
            '--update-similarities',
            action='store_true',
            help='Обновить матрицы сходства пользователей и треков'
        )
    
    def handle(self, *args, **options):
        start_time = time.time()
        
        # Обновление матриц сходства
        if options['update_similarities']:
            self.stdout.write("Обновление матриц сходства пользователей и треков...")
            
            # Обновление матрицы сходства пользователей
            collab_engine = CollaborativeFilteringEngine()
            collab_engine.update_user_similarities()
            self.stdout.write(self.style.SUCCESS("Матрица сходства пользователей обновлена"))
            
            # Обновление матрицы сходства треков на основе коллаборативной фильтрации
            collab_engine.update_track_similarities()
            self.stdout.write(self.style.SUCCESS("Матрица сходства треков (коллаборативная) обновлена"))
            
            # Обновление матрицы сходства треков на основе контентной фильтрации
            content_engine = ContentBasedFilteringEngine()
            content_engine.update_track_content_similarities()
            self.stdout.write(self.style.SUCCESS("Матрица сходства треков (контентная) обновлена"))
        
        # Обновление рекомендаций
        engine = RecommendationEngine()
        
        # Если указан ID пользователя, обновляем рекомендации только для него
        if options['user_id']:
            try:
                user = User.objects.get(id=options['user_id'])
                self.stdout.write(f"Обновление рекомендаций для пользователя {user.username}...")
                recommendations = engine.get_recommendations_for_user(user.id)
                self.stdout.write(self.style.SUCCESS(
                    f"Рекомендации для пользователя {user.username} обновлены. "
                    f"Получено {len(recommendations)} рекомендаций."
                ))
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Пользователь с ID {options['user_id']} не найден."))
        else:
            # Обновляем рекомендации для всех пользователей
            users = User.objects.all()
            self.stdout.write(f"Обновление рекомендаций для {users.count()} пользователей...")
            
            success_count = 0
            for user in users:
                try:
                    recommendations = engine.get_recommendations_for_user(user.id)
                    success_count += 1
                    self.stdout.write(f"Обновлены рекомендации для {user.username}: {len(recommendations)} рекомендаций")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Ошибка при обновлении рекомендаций для {user.username}: {e}"))
            
            self.stdout.write(self.style.SUCCESS(
                f"Рекомендации обновлены для {success_count} из {users.count()} пользователей."
            ))
        
        elapsed_time = time.time() - start_time
        self.stdout.write(self.style.SUCCESS(f"Операция завершена за {elapsed_time:.2f} секунд."))