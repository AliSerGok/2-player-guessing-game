from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError


class BetSettings(models.Model):
    """Singleton model for bet configuration"""
    min_bet = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=10.00,
        validators=[MinValueValidator(0.01)]
    )
    max_bet = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=1000.00,
        validators=[MinValueValidator(0.01)]
    )
    step = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=5.00,
        validators=[MinValueValidator(0.01)]
    )

    class Meta:
        db_table = 'bet_settings'
        verbose_name = 'Bet Settings'
        verbose_name_plural = 'Bet Settings'

    def __str__(self):
        return f"Bet Settings (Min: {self.min_bet}, Max: {self.max_bet}, Step: {self.step})"

    def save(self, *args, **kwargs):
        # Enforce singleton pattern
        if not self.pk and BetSettings.objects.exists():
            raise ValidationError('Only one BetSettings instance is allowed')

        # Validate min < max
        if self.min_bet >= self.max_bet:
            raise ValidationError('min_bet must be less than max_bet')

        # Validate step
        if self.step <= 0:
            raise ValidationError('step must be greater than 0')

        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Prevent deletion
        pass

    @classmethod
    def get_settings(cls):
        """Get or create the singleton instance"""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


class Room(models.Model):
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('FULL', 'Full'),
        ('COMPLETED', 'Completed'),
    ]

    bet_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_rooms'
    )
    player1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rooms_as_player1'
    )
    player2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rooms_as_player2'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'rooms'
        ordering = ['-created_at']
        verbose_name = 'Room'
        verbose_name_plural = 'Rooms'

    def __str__(self):
        return f"Room {self.id} - {self.status} - Bet: {self.bet_amount}"

    @property
    def players_count(self):
        count = 0
        if self.player1:
            count += 1
        if self.player2:
            count += 1
        return count

    @property
    def is_full(self):
        return self.players_count == 2

    def add_player(self, user):
        """Add a player to the room"""
        if self.player1 is None:
            self.player1 = user
        elif self.player2 is None:
            self.player2 = user
        else:
            raise ValueError("Room is already full")

        if self.is_full:
            self.status = 'FULL'
        self.save()


class Game(models.Model):
    STATUS_CHOICES = [
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    ]

    room = models.OneToOneField(Room, on_delete=models.CASCADE, related_name='game')
    secret_number = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    current_turn = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='current_games'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_PROGRESS')
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='won_games'
    )
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'games'
        ordering = ['-started_at']
        verbose_name = 'Game'
        verbose_name_plural = 'Games'

    def __str__(self):
        return f"Game {self.id} - Room {self.room_id} - {self.status}"


class Guess(models.Model):
    FEEDBACK_CHOICES = [
        ('UP', 'Guess Higher'),
        ('DOWN', 'Guess Lower'),
        ('CORRECT', 'Correct'),
    ]

    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='guesses')
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='guesses'
    )
    guess_number = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    feedback = models.CharField(max_length=20, choices=FEEDBACK_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'guesses'
        ordering = ['created_at']
        verbose_name = 'Guess'
        verbose_name_plural = 'Guesses'

    def __str__(self):
        return f"Guess {self.id} - {self.player.email} - {self.guess_number} ({self.feedback})"
