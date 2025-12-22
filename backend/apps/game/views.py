from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from .models import Room, Game, Guess
from .serializers import (
    RoomSerializer, CreateRoomSerializer,
    GameSerializer, GuessSerializer, MakeGuessSerializer
)
from .services import GameService


class RoomListView(generics.ListAPIView):
    """List all available rooms"""
    permission_classes = (IsAuthenticated,)
    serializer_class = RoomSerializer

    def get_queryset(self):
        # Can filter by status if needed
        status_filter = self.request.query_params.get('status', None)
        queryset = Room.objects.all()

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset


class CreateRoomView(APIView):
    """Create a new room"""
    permission_classes = (IsAuthenticated,)

    @transaction.atomic
    def post(self, request):
        serializer = CreateRoomSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        bet_amount = serializer.validated_data['bet_amount']

        # Check balance
        if request.user.balance < bet_amount:
            return Response({
                'error': 'Insufficient balance'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create room with creator as player1
        room = Room.objects.create(
            bet_amount=bet_amount,
            creator=request.user,
            player1=request.user
        )

        return Response({
            'message': 'Room created successfully',
            'room': RoomSerializer(room).data
        }, status=status.HTTP_201_CREATED)


class RoomDetailView(generics.RetrieveAPIView):
    """Get room details"""
    permission_classes = (IsAuthenticated,)
    serializer_class = RoomSerializer
    queryset = Room.objects.all()


class JoinRoomView(APIView):
    """Join an existing room"""
    permission_classes = (IsAuthenticated,)

    @transaction.atomic
    def post(self, request, pk):
        room = get_object_or_404(Room, pk=pk)

        # Validate room status
        if room.status != 'OPEN':
            return Response({
                'error': 'Room is not available for joining'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if room is full
        if room.is_full:
            return Response({
                'error': 'Room is already full'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if user is already in the room
        if room.player1 == request.user or room.player2 == request.user:
            return Response({
                'error': 'You are already in this room'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check balance
        if request.user.balance < room.bet_amount:
            return Response({
                'error': 'Insufficient balance'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Add player to room
        try:
            room.add_player(request.user)
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'message': 'Successfully joined the room',
            'room': RoomSerializer(room).data
        }, status=status.HTTP_200_OK)


class MyRoomsView(generics.ListAPIView):
    """List rooms where the user is a participant"""
    permission_classes = (IsAuthenticated,)
    serializer_class = RoomSerializer

    def get_queryset(self):
        user = self.request.user
        return Room.objects.filter(
            Q(player1=user) | Q(player2=user)
        )


class StartGameView(APIView):
    """Start a game for a FULL room"""
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        room = get_object_or_404(Room, pk=pk)

        # Check if user is a participant
        if request.user not in [room.player1, room.player2]:
            return Response({
                'error': 'You are not a participant in this room'
            }, status=status.HTTP_403_FORBIDDEN)

        # Check if game already exists
        if hasattr(room, 'game'):
            return Response({
                'error': 'Game already started for this room',
                'game': GameSerializer(room.game).data
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            game = GameService.start_game(room)
            return Response({
                'message': 'Game started successfully',
                'game': GameSerializer(game).data
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class GameDetailView(generics.RetrieveAPIView):
    """Get game details"""
    permission_classes = (IsAuthenticated,)
    serializer_class = GameSerializer
    queryset = Game.objects.all()

    def get_queryset(self):
        # Only show games where user is a participant
        user = self.request.user
        return Game.objects.filter(
            Q(room__player1=user) | Q(room__player2=user)
        )


class MakeGuessView(APIView):
    """Make a guess in the game"""
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        game = get_object_or_404(Game, pk=pk)

        # Check if user is a participant
        if request.user not in [game.room.player1, game.room.player2]:
            return Response({
                'error': 'You are not a participant in this game'
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = MakeGuessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        guess_number = serializer.validated_data['guess_number']

        try:
            guess = GameService.make_guess(game, request.user, guess_number)

            # Refresh game from database to get latest state
            game.refresh_from_db()

            return Response({
                'message': 'Guess recorded',
                'guess': GuessSerializer(guess).data,
                'game': GameSerializer(game).data
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class MyGamesView(generics.ListAPIView):
    """List games where the user is a participant"""
    permission_classes = (IsAuthenticated,)
    serializer_class = GameSerializer

    def get_queryset(self):
        user = self.request.user
        return Game.objects.filter(
            Q(room__player1=user) | Q(room__player2=user)
        )
