from django.urls import path
from .views import (
    RoomListView, CreateRoomView, RoomDetailView,
    JoinRoomView, MyRoomsView,
    StartGameView, GameDetailView, MakeGuessView, MyGamesView,
    AdminRoomsListView, AdminGamesListView, BetSettingsView
)

app_name = 'game'

urlpatterns = [
    # Room endpoints
    path('rooms/', RoomListView.as_view(), name='room_list'),
    path('rooms/create/', CreateRoomView.as_view(), name='create_room'),
    path('rooms/my/', MyRoomsView.as_view(), name='my_rooms'),
    path('rooms/<int:pk>/', RoomDetailView.as_view(), name='room_detail'),
    path('rooms/<int:pk>/join/', JoinRoomView.as_view(), name='join_room'),
    path('rooms/<int:pk>/start/', StartGameView.as_view(), name='start_game'),

    # Game endpoints
    path('games/my/', MyGamesView.as_view(), name='my_games'),
    path('games/<int:pk>/', GameDetailView.as_view(), name='game_detail'),
    path('games/<int:pk>/guess/', MakeGuessView.as_view(), name='make_guess'),

    # Bet settings
    path('bet-settings/', BetSettingsView.as_view(), name='bet_settings'),

    # Admin endpoints
    path('admin/rooms/', AdminRoomsListView.as_view(), name='admin_rooms_list'),
    path('admin/games/', AdminGamesListView.as_view(), name='admin_games_list'),
]
