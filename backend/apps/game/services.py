import random
from django.db import transaction
from django.utils import timezone
from django.db.models import F
from decimal import Decimal
from .models import Game, Guess, Room
from apps.users.models import Transaction


class GameService:
    """Service class for game business logic"""

    @staticmethod
    def start_game(room):
        """
        Start a new game for a full room
        - Generate random secret number (1-100)
        - Coin toss to determine first player
        - Create game instance
        - Deduct bet amount from both players
        """
        if room.status != 'FULL':
            raise ValueError("Room must be FULL to start a game")

        if not room.player1 or not room.player2:
            raise ValueError("Room must have 2 players")

        if hasattr(room, 'game'):
            raise ValueError("Game already exists for this room")

        with transaction.atomic():
            # Generate secret number
            secret_number = random.randint(1, 100)

            # Coin toss - randomly select first player
            first_player = random.choice([room.player1, room.player2])

            # Create game
            game = Game.objects.create(
                room=room,
                secret_number=secret_number,
                current_turn=first_player
            )

            # Deduct bet amount from both players
            from django.contrib.auth import get_user_model
            User = get_user_model()

            # Lock and update player1
            player1 = User.objects.select_for_update().get(pk=room.player1.pk)
            if player1.balance < room.bet_amount:
                raise ValueError(f"Player {player1.email} has insufficient balance")

            player1.balance = F('balance') - room.bet_amount
            player1.save(update_fields=['balance'])

            # Lock and update player2
            player2 = User.objects.select_for_update().get(pk=room.player2.pk)
            if player2.balance < room.bet_amount:
                raise ValueError(f"Player {player2.email} has insufficient balance")

            player2.balance = F('balance') - room.bet_amount
            player2.save(update_fields=['balance'])

            # Create transaction records
            Transaction.objects.create(
                user=room.player1,
                amount=room.bet_amount,
                type='bet'
            )

            Transaction.objects.create(
                user=room.player2,
                amount=room.bet_amount,
                type='bet'
            )

            return game

    @staticmethod
    def get_feedback(secret_number, guess_number):
        """
        Generate feedback for a guess
        Returns: 'UP', 'DOWN', or 'CORRECT'
        """
        if guess_number == secret_number:
            return 'CORRECT'
        elif guess_number < secret_number:
            return 'UP'  # Secret is higher, guess UP
        else:
            return 'DOWN'  # Secret is lower, guess DOWN

    @staticmethod
    def make_guess(game, player, guess_number):
        """
        Process a player's guess
        - Validate it's player's turn
        - Validate guess is within range
        - Generate feedback
        - Create guess record
        - Switch turn or end game
        """
        if game.status != 'IN_PROGRESS':
            raise ValueError("Game is not in progress")

        if game.current_turn != player:
            raise ValueError("It's not your turn")

        if guess_number < 1 or guess_number > 100:
            raise ValueError("Guess must be between 1 and 100")

        with transaction.atomic():
            # Generate feedback
            feedback = GameService.get_feedback(game.secret_number, guess_number)

            # Create guess record
            guess = Guess.objects.create(
                game=game,
                player=player,
                guess_number=guess_number,
                feedback=feedback
            )

            # Check if game is won
            if feedback == 'CORRECT':
                GameService.end_game(game, player)
            else:
                # Switch turn
                GameService.switch_turn(game)

            return guess

    @staticmethod
    def switch_turn(game):
        """Switch the current turn to the other player"""
        room = game.room

        if game.current_turn == room.player1:
            game.current_turn = room.player2
        else:
            game.current_turn = room.player1

        game.save(update_fields=['current_turn'])

    @staticmethod
    def end_game(game, winner):
        """
        End the game
        - Set winner
        - Set status to COMPLETED
        - Set ended_at timestamp
        - Award winnings to winner (2x bet amount)
        - Update room status to COMPLETED
        """
        with transaction.atomic():
            game.winner = winner
            game.status = 'COMPLETED'
            game.ended_at = timezone.now()
            game.save()

            # Update room status
            room = game.room
            room.status = 'COMPLETED'
            room.save(update_fields=['status'])

            # Award winnings (2x bet amount = original bet + opponent's bet)
            from django.contrib.auth import get_user_model
            User = get_user_model()

            winner_user = User.objects.select_for_update().get(pk=winner.pk)
            winnings = room.bet_amount * 2

            winner_user.balance = F('balance') + winnings
            winner_user.save(update_fields=['balance'])

            # Create transaction record for winnings
            Transaction.objects.create(
                user=winner,
                amount=winnings,
                type='win'
            )

    @staticmethod
    def get_game_state(game):
        """
        Get the current state of the game
        Returns a dictionary with game information
        """
        return {
            'game_id': game.id,
            'room_id': game.room_id,
            'status': game.status,
            'current_turn': game.current_turn_id,
            'winner': game.winner_id if game.winner else None,
            'total_guesses': game.guesses.count(),
            'started_at': game.started_at,
            'ended_at': game.ended_at,
        }
