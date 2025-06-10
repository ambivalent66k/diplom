from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserFollowing


class UserFollowingInline(admin.TabularInline):
    model = UserFollowing
    fk_name = 'user'
    extra = 1
    verbose_name = 'Подписка'
    verbose_name_plural = 'Подписки'


class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Профиль', {'fields': ('avatar', 'bio', 'location', 'website', 'favorite_genres', 'listen_count')}),
    )
    
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'listen_count')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    
    inlines = [UserFollowingInline]


admin.site.register(User, UserAdmin)