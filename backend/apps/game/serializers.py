from rest_framework import serializers
from django.contrib.auth import get_user_model
from decimal import Decimal
from .models import Room, BetSettings, Game, Guess

User = get_user_model()


class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'balance')


class RoomSerializer(serializers.ModelSerializer):
    creator_email = serializers.EmailField(source='creator.email', read_only=True)
    player1_email = serializers.EmailField(source='player1.email', read_only=True, allow_null=True)
    player2_email = serializers.EmailField(source='player2.email', read_only=True, allow_null=True)
    players_count = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)

    class Meta:
        model = Room
        fields = (
            'id', 'bet_amount', 'status',
            'creator', 'creator_email',
            'player1', 'player1_email',
            'player2', 'player2_email',
            'players_count', 'is_full',
            'created_at', 'updated_at'
        )
        read_only_fields = (
            'id', 'status', 'creator', 'player1', 'player2',
            'created_at', 'updated_at'
        )


class CreateRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ('bet_amount',)

    def validate_bet_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Bet amount must be greater than 0")

        # Get bet settings
        settings = BetSettings.get_settings()

        # Validate against min_bet
        if value < settings.min_bet:
            raise serializers.ValidationError(
                f"Bet amount must be at least {settings.min_bet}"
            )

        # Validate against max_bet
        if value > settings.max_bet:
            raise serializers.ValidationError(
                f"Bet amount must not exceed {settings.max_bet}"
            )

        # Validate step increment
        if settings.step > 0:
            # Ensure all values are Decimal for arithmetic operations
            min_bet = Decimal(str(settings.min_bet))
            step = Decimal(str(settings.step))
            diff = value - min_bet
            remainder = diff % step
            if remainder != 0:
                raise serializers.ValidationError(
                    f"Bet amount must be in increments of {step} starting from {min_bet}"
                )

        return value

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            bet_amount = attrs.get('bet_amount')

            if user.balance < bet_amount:
                raise serializers.ValidationError({
                    'bet_amount': 'Insufficient balance. Your balance is less than the bet amount.'
                })

        return attrs


class GuessSerializer(serializers.ModelSerializer):
    player_email = serializers.EmailField(source='player.email', read_only=True)

    class Meta:
        model = Guess
        fields = ('id', 'game', 'player', 'player_email', 'guess_number', 'feedback', 'created_at')
        read_only_fields = ('id', 'game', 'player', 'feedback', 'created_at')


class GameSerializer(serializers.ModelSerializer):
    room_id = serializers.IntegerField(source='room.id', read_only=True)
    player1_email = serializers.EmailField(source='room.player1.email', read_only=True)
    player2_email = serializers.EmailField(source='room.player2.email', read_only=True)
    current_turn_email = serializers.EmailField(source='current_turn.email', read_only=True, allow_null=True)
    winner_email = serializers.EmailField(source='winner.email', read_only=True, allow_null=True)
    bet_amount = serializers.DecimalField(source='room.bet_amount', max_digits=10, decimal_places=2, read_only=True)
    guesses = GuessSerializer(many=True, read_only=True)

    class Meta:
        model = Game
        fields = (
            'id', 'room_id', 'bet_amount', 'status',
            'player1_email', 'player2_email',
            'current_turn', 'current_turn_email',
            'winner', 'winner_email',
            'started_at', 'ended_at',
            'guesses'
        )
        read_only_fields = (
            'id', 'room_id', 'status', 'current_turn', 'winner',
            'started_at', 'ended_at'
        )


class MakeGuessSerializer(serializers.Serializer):
    guess_number = serializers.IntegerField(min_value=1, max_value=100)

    def validate_guess_number(self, value):
        if value < 1 or value > 100:
            raise serializers.ValidationError("Guess must be between 1 and 100")
        return value
