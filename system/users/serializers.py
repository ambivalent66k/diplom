from rest_framework import serializers
from .models import User, UserFollowing

class UserSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели пользователя
    """
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 
            'avatar', 'bio', 'location', 'website', 'favorite_genres', 
            'listen_count', 'date_joined', 'followers_count', 'following_count'
        )
        read_only_fields = ('id', 'date_joined', 'listen_count', 'email')
    
    def get_followers_count(self, obj):
        return obj.followers.count()
    
    def get_following_count(self, obj):
        return obj.following.count()


class UserProfileSerializer(UserSerializer):
    """
    Расширенный сериализатор для профиля пользователя
    """
    is_following = serializers.SerializerMethodField()
    
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ('is_following',)
    
    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return UserFollowing.objects.filter(
                user=request.user, 
                following_user=obj
            ).exists()
        return False


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Сериализатор для регистрации пользователя
    """
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = (
            'username', 'email', 'password', 'password_confirm', 
            'first_name', 'last_name'
        )
    
    def validate(self, attrs):
        # Проверяем совпадение паролей
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Пароли не совпадают.'
            })
        return attrs
    
    def create(self, validated_data):
        # Удаляем поле password_confirm, так как оно не нужно для создания пользователя
        validated_data.pop('password_confirm', None)
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user


class UserFollowingSerializer(serializers.ModelSerializer):
    """
    Сериализатор для подписок пользователей
    """
    following_user_detail = UserSerializer(source='following_user', read_only=True)
    
    class Meta:
        model = UserFollowing
        fields = ('id', 'user', 'following_user', 'following_user_detail', 'created_at')
        read_only_fields = ('id', 'created_at', 'user')
        extra_kwargs = {
            'following_user': {'write_only': True}
        }
    
    def create(self, validated_data):
        # Устанавливаем текущего пользователя
        user = self.context['request'].user
        validated_data['user'] = user
        
        # Проверяем, что пользователь не подписывается сам на себя
        if validated_data['following_user'] == user:
            raise serializers.ValidationError(
                {'following_user': 'Вы не можете подписаться на самого себя.'}
            )
        
        return super().create(validated_data)