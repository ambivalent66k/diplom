# music_recommender/middleware.py

import os
import mimetypes
from django.http import StreamingHttpResponse, Http404, HttpResponse
from django.utils.http import http_date
from django.conf import settings
from django.core.files.storage import default_storage


class RangeRequestMiddleware:
    """
    Middleware для поддержки Range requests для аудио файлов.
    Это позволяет браузерам загружать аудио частями и поддерживает перемотку.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Обрабатываем только медиа файлы
        if request.path.startswith(settings.MEDIA_URL):
            return self.process_media_request(request) or response
        
        return response

    def process_media_request(self, request):
        """
        Обрабатывает запросы к медиа файлам с поддержкой Range requests
        """
        # Получаем путь к файлу
        media_path = request.path[len(settings.MEDIA_URL):]
        file_path = os.path.join(settings.MEDIA_ROOT, media_path)
        
        # Проверяем существование файла
        if not os.path.exists(file_path):
            return None  # Пусть Django обработает 404
        
        # Проверяем, является ли файл аудио
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type or not content_type.startswith('audio/'):
            return None  # Обрабатываем только аудио файлы
        
        # Получаем размер файла
        file_size = os.path.getsize(file_path)
        
        # Проверяем наличие Range заголовка
        range_header = request.META.get('HTTP_RANGE')
        
        if range_header:
            return self.serve_range_request(file_path, file_size, range_header, content_type)
        else:
            return self.serve_full_file(file_path, file_size, content_type)

    def serve_range_request(self, file_path, file_size, range_header, content_type):
        """
        Обслуживает частичный запрос (Range request)
        """
        try:
            # Парсим Range заголовок (например: "bytes=200-1023")
            ranges = self.parse_range_header(range_header, file_size)
            
            if not ranges:
                # Неверный Range заголовок
                response = HttpResponse(status=416)  # Range Not Satisfiable
                response['Content-Range'] = f'bytes */{file_size}'
                return response
            
            # Берем первый диапазон (для простоты)
            start, end = ranges[0]
            content_length = end - start + 1
            
            # Создаем streaming response
            def file_iterator():
                with open(file_path, 'rb') as f:
                    f.seek(start)
                    remaining = content_length
                    while remaining > 0:
                        chunk_size = min(8192, remaining)  # 8KB chunks
                        chunk = f.read(chunk_size)
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk
            
            response = StreamingHttpResponse(
                file_iterator(),
                status=206,  # Partial Content
                content_type=content_type
            )
            
            response['Content-Length'] = str(content_length)
            response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            response['Accept-Ranges'] = 'bytes'
            response['Cache-Control'] = 'no-cache'
            
            return response
            
        except Exception as e:
            # В случае ошибки возвращаем полный файл
            return self.serve_full_file(file_path, file_size, content_type)

    def serve_full_file(self, file_path, file_size, content_type):
        """
        Обслуживает полный файл
        """
        def file_iterator():
            with open(file_path, 'rb') as f:
                while True:
                    chunk = f.read(8192)  # 8KB chunks
                    if not chunk:
                        break
                    yield chunk
        
        response = StreamingHttpResponse(
            file_iterator(),
            content_type=content_type
        )
        
        response['Content-Length'] = str(file_size)
        response['Accept-Ranges'] = 'bytes'
        response['Cache-Control'] = 'public, max-age=3600'  # Cache for 1 hour
        
        return response

    def parse_range_header(self, range_header, file_size):
        """
        Парсит Range заголовок и возвращает список диапазонов
        """
        if not range_header.startswith('bytes='):
            return []
        
        ranges = []
        range_specs = range_header[6:].split(',')
        
        for range_spec in range_specs:
            range_spec = range_spec.strip()
            
            if '-' not in range_spec:
                continue
            
            start_str, end_str = range_spec.split('-', 1)
            
            try:
                if start_str:
                    start = int(start_str)
                    if end_str:
                        end = min(int(end_str), file_size - 1)
                    else:
                        end = file_size - 1
                else:
                    # Suffix-byte-range-spec (например: "-500" для последних 500 байт)
                    if end_str:
                        suffix_length = int(end_str)
                        start = max(0, file_size - suffix_length)
                        end = file_size - 1
                    else:
                        continue
                
                if start <= end and start < file_size:
                    ranges.append((start, min(end, file_size - 1)))
                    
            except ValueError:
                continue
        
        return ranges