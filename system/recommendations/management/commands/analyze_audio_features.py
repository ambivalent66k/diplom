from django.core.management.base import BaseCommand
from tracks.models import Track
from tracks.utils import analyze_audio, generate_spectrogram
import os


class Command(BaseCommand):
    help = 'Анализирует аудио-характеристики треков'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--track_id',
            type=int,
            help='ID трека для анализа'
        )
        parser.add_argument(
            '--generate-spectrograms',
            action='store_true',
            help='Генерировать спектрограммы для треков'
        )
    
    def handle(self, *args, **options):
        # Если указан ID трека, анализируем только его
        if options['track_id']:
            try:
                track = Track.objects.get(id=options['track_id'])
                self.analyze_track(track, options['generate_spectrograms'])
            except Track.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Трек с ID {options['track_id']} не найден."))
            return
        
        # Анализируем все треки без аудио-характеристик
        tracks = Track.objects.filter(audio_features__isnull=True)
        total = tracks.count()
        
        self.stdout.write(f"Начинаем анализ {total} треков...")
        
        success_count = 0
        for idx, track in enumerate(tracks):
            try:
                self.analyze_track(track, options['generate_spectrograms'])
                success_count += 1
                self.stdout.write(f"Проанализирован трек {idx+1}/{total}: {track.title}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Ошибка при анализе трека {track.title}: {e}"))
        
        self.stdout.write(self.style.SUCCESS(
            f"Анализ завершен. Успешно проанализировано {success_count} из {total} треков."
        ))
    
    def analyze_track(self, track, generate_spectrograms=False):
        """
        Анализирует аудио-характеристики трека и сохраняет их в базу данных
        """
        # Получаем путь к файлу
        file_path = track.audio_file.path
        
        # Проверяем, существует ли файл
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"Файл {file_path} не найден."))
            return
        
        # Анализируем аудио-характеристики
        audio_features = analyze_audio(file_path)
        
        # Сохраняем характеристики в базу данных
        track.audio_features = audio_features
        
        # Если указано, генерируем спектрограмму
        if generate_spectrograms:
            try:
                spectrogram_path = generate_spectrogram(file_path)
                if spectrogram_path:
                    # В реальном проекте можно добавить поле в модель Track для хранения пути к спектрограмме
                    self.stdout.write(f"Спектрограмма сохранена: {spectrogram_path}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Ошибка при генерации спектрограммы: {e}"))
        
        # Сохраняем изменения
        track.save(update_fields=['audio_features'])
        
        return audio_features