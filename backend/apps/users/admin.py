from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Transaction


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'age', 'role', 'balance', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('age', 'role', 'balance')}),
        ('Permissions', {'fields': ('is_staff', 'is_active', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'age', 'password1', 'password2', 'balance'),
        }),
    )
    search_fields = ('email',)
    ordering = ('email',)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'amount', 'created_at')
    list_filter = ('type', 'created_at')
    search_fields = ('user__email',)
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
