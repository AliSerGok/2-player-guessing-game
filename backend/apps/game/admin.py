from django.contrib import admin
from .models import Room, BetSettings, Game, Guess


@admin.register(BetSettings)
class BetSettingsAdmin(admin.ModelAdmin):
    list_display = ('min_bet', 'max_bet', 'step')
    fieldsets = (
        ('Bet Configuration', {
            'fields': ('min_bet', 'max_bet', 'step'),
            'description': 'Configure betting limits and step increments for room creation.'
        }),
    )

    def has_add_permission(self, request):
        # Only allow adding if no instance exists
        return not BetSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Never allow deletion
        return False


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('id', 'bet_amount', 'status', 'creator', 'player1', 'player2', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('creator__email', 'player1__email', 'player2__email')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ('id', 'room', 'status', 'current_turn', 'winner', 'started_at', 'ended_at')
    list_filter = ('status', 'started_at')
    search_fields = ('room__id', 'winner__email')
    readonly_fields = ('room', 'secret_number', 'started_at', 'ended_at')
    ordering = ('-started_at',)


@admin.register(Guess)
class GuessAdmin(admin.ModelAdmin):
    list_display = ('id', 'game', 'player', 'guess_number', 'feedback', 'created_at')
    list_filter = ('feedback', 'created_at')
    search_fields = ('game__id', 'player__email')
    readonly_fields = ('game', 'player', 'guess_number', 'feedback', 'created_at')
    ordering = ('game', 'created_at')
