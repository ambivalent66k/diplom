# tracks/permissions.py

from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Пользовательское разрешение, позволяющее только владельцам объекта редактировать его.
    """
    
    def has_object_permission(self, request, view, obj):
        # Разрешения на чтение доступны для любого запроса
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Права на запись имеет только владелец
        # Проверяем, есть ли у объекта атрибут 'user' или 'artist'
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'artist'):
            return obj.artist == request.user
        
        # Если у объекта нет этих атрибутов, запрещаем доступ
        return False