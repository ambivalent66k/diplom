from rest_framework import viewsets, generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from django.shortcuts import get_object_or_404

from .models import User, UserFollowing
from .serializers import (
    UserSerializer, UserProfileSerializer, UserRegistrationSerializer,
    UserFollowingSerializer
)

class UserViewSet(viewsets.ModelViewSet):
    """
    Представление для работы с пользователями
    """
    queryset = User.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserProfileSerializer
        return UserSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Получение информации о текущем пользователе
        """
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['put', 'patch'])
    def update_me(self, request):
        """
        Обновление информации о текущем пользователе
        """
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def followers(self, request, pk=None):
        """
        Получение списка подписчиков пользователя
        """
        user = self.get_object()
        followers = User.objects.filter(following__following_user=user)
        page = self.paginate_queryset(followers)
        
        if page is not None:
            serializer = UserSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = UserSerializer(followers, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def following(self, request, pk=None):
        """
        Получение списка пользователей, на которых подписан текущий пользователь
        """
        user = self.get_object()
        following = User.objects.filter(followers__user=user)
        page = self.paginate_queryset(following)
        
        if page is not None:
            serializer = UserSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = UserSerializer(following, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def follow(self, request, pk=None):
        """
        Подписка на пользователя
        """
        user_to_follow = self.get_object()
        
        if user_to_follow == request.user:
            return Response(
                {'detail': 'Вы не можете подписаться на самого себя'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        following, created = UserFollowing.objects.get_or_create(
            user=request.user,
            following_user=user_to_follow
        )
        
        if created:
            return Response(
                {'detail': f'Вы успешно подписались на {user_to_follow.username}'},
                status=status.HTTP_201_CREATED
            )
        return Response(
            {'detail': f'Вы уже подписаны на {user_to_follow.username}'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unfollow(self, request, pk=None):
        """
        Отписка от пользователя
        """
        user_to_unfollow = self.get_object()
        
        try:
            following = UserFollowing.objects.get(
                user=request.user,
                following_user=user_to_unfollow
            )
            following.delete()
            return Response(
                {'detail': f'Вы отписались от {user_to_unfollow.username}'},
                status=status.HTTP_200_OK
            )
        except UserFollowing.DoesNotExist:
            return Response(
                {'detail': f'Вы не подписаны на {user_to_unfollow.username}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class UserRegistrationView(generics.CreateAPIView):
    """
    Представление для регистрации пользователей
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Создаем токен для пользователя
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': UserSerializer(user, context=self.get_serializer_context()).data,
            'token': token.key
        }, status=status.HTTP_201_CREATED)


class CustomAuthToken(ObtainAuthToken):
    """
    Представление для получения токена аутентификации
    """
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'email': user.email
        })


class LogoutView(APIView):
    """
    Представление для выхода из системы (удаление токена)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            request.user.auth_token.delete()
            return Response(
                {'detail': 'Успешный выход из системы.'},
                status=status.HTTP_200_OK
            )
        except Exception:
            return Response(
                {'detail': 'Ошибка при выходе из системы.'},
                status=status.HTTP_400_BAD_REQUEST
            )