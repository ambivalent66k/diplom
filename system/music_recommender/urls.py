from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import routers
from tracks.views import get_csrf_token

from users.views import UserViewSet, UserRegistrationView, CustomAuthToken, LogoutView
from tracks.views import (
    TrackViewSet, GenreViewSet, PlaylistViewSet, 
    CommentViewSet, UserTrackInteractionViewSet
)
from recommendations.views import (
    RecommendationViewSet, UserPreferenceViewSet, RefreshRecommendationsView
)

# Создаем роутер для API
router = routers.DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'tracks', TrackViewSet)
router.register(r'genres', GenreViewSet)
router.register(r'playlists', PlaylistViewSet)
router.register(r'comments', CommentViewSet)
router.register(r'interactions', UserTrackInteractionViewSet)
router.register(r'recommendations', RecommendationViewSet)
router.register(r'preferences', UserPreferenceViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Специальные пути ПЕРЕД роутером для избежания конфликтов
    path('api/auth/register/', UserRegistrationView.as_view(), name='register'),
    path('api/auth/token/', CustomAuthToken.as_view(), name='token_obtain'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/recommendations-refresh/', RefreshRecommendationsView.as_view(), name='refresh_recommendations'),
    path('api/get-csrf-token/', get_csrf_token, name='get-csrf-token'),
    
    # API URLs (роутер должен быть ПОСЛЕ специальных путей)
    path('api/', include(router.urls)),
    path('api/auth/', include('rest_framework.urls')),
]

# Добавляем URLs для работы с медиа-файлами во время разработки
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)