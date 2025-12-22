import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import Game, Room
from .services import GameService
from .serializers import GameSerializer, GuessSerializer


class GameConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time game updates
    URL: ws://host/ws/game/<room_id>/?token=<jwt_token>
    """

    async def connect(self):
        """Handle WebSocket connection"""
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'game_room_{self.room_id}'
        self.user = self.scope['user']

        # Reject anonymous users
        if isinstance(self.user, AnonymousUser):
            await self.close(code=4001)
            return

        # Verify user is a participant in the room
        is_participant = await self.check_room_participant()
        if not is_participant:
            await self.close(code=4003)
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send connection success message
        await self.send(text_data=json.dumps({
            'type': 'CONNECTION_SUCCESS',
            'message': 'Connected to game room',
            'room_id': self.room_id
        }))

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Leave room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            event_type = data.get('type')

            if event_type == 'JOIN_GAME':
                await self.handle_join_game()
            elif event_type == 'MAKE_GUESS':
                guess_number = data.get('guess_number')
                await self.handle_make_guess(guess_number)
            else:
                await self.send_error('Unknown event type')

        except json.JSONDecodeError:
            await self.send_error('Invalid JSON')
        except Exception as e:
            await self.send_error(str(e))

    async def handle_join_game(self):
        """Handle JOIN_GAME event"""
        game_data = await self.get_game_data()

        if game_data:
            # Game already exists, send current state
            await self.send(text_data=json.dumps({
                'type': 'GAME_STATE',
                'game': game_data
            }))
        else:
            # Try to start the game
            try:
                game_data = await self.start_game()

                # Broadcast game start to all participants
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'game_started',
                        'game': game_data
                    }
                )
            except Exception as e:
                await self.send_error(str(e))

    async def handle_make_guess(self, guess_number):
        """Handle MAKE_GUESS event"""
        if guess_number is None:
            await self.send_error('guess_number is required')
            return

        try:
            # Validate and process guess
            result = await self.process_guess(guess_number)

            if result['success']:
                guess_data = result['guess']
                game_data = result['game']
                is_game_over = result['is_game_over']

                if is_game_over:
                    # Broadcast game end
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'game_ended',
                            'game': game_data,
                            'guess': guess_data
                        }
                    )
                else:
                    # Broadcast turn update
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'turn_updated',
                            'game': game_data,
                            'guess': guess_data
                        }
                    )
            else:
                await self.send_error(result['error'])

        except Exception as e:
            await self.send_error(str(e))

    # Group message handlers (called by channel_layer.group_send)

    async def game_started(self, event):
        """Broadcast GAME_START event to group"""
        await self.send(text_data=json.dumps({
            'type': 'GAME_START',
            'game': event['game']
        }))

    async def turn_updated(self, event):
        """Broadcast TURN_UPDATE event to group"""
        await self.send(text_data=json.dumps({
            'type': 'TURN_UPDATE',
            'game': event['game'],
            'guess': event['guess']
        }))

    async def game_ended(self, event):
        """Broadcast GAME_END event to group"""
        await self.send(text_data=json.dumps({
            'type': 'GAME_END',
            'game': event['game'],
            'guess': event['guess']
        }))

    # Helper methods

    async def send_error(self, message):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            'type': 'ERROR',
            'error': message
        }))

    @database_sync_to_async
    def check_room_participant(self):
        """Check if user is a participant in the room"""
        try:
            room = Room.objects.get(id=self.room_id)
            return self.user in [room.player1, room.player2]
        except Room.DoesNotExist:
            return False

    @database_sync_to_async
    def get_game_data(self):
        """Get current game state"""
        try:
            room = Room.objects.get(id=self.room_id)
            if hasattr(room, 'game'):
                game = room.game
                serializer = GameSerializer(game)
                return serializer.data
            return None
        except Room.DoesNotExist:
            return None

    @database_sync_to_async
    def start_game(self):
        """Start a new game"""
        room = Room.objects.get(id=self.room_id)
        game = GameService.start_game(room)
        serializer = GameSerializer(game)
        return serializer.data

    @database_sync_to_async
    def process_guess(self, guess_number):
        """Process a guess and return result"""
        try:
            room = Room.objects.get(id=self.room_id)
            game = room.game

            # Make the guess using GameService
            guess = GameService.make_guess(game, self.user, guess_number)

            # Refresh game from database
            game.refresh_from_db()

            # Serialize data
            guess_serializer = GuessSerializer(guess)
            game_serializer = GameSerializer(game)

            return {
                'success': True,
                'guess': guess_serializer.data,
                'game': game_serializer.data,
                'is_game_over': game.status == 'COMPLETED'
            }
        except ValueError as e:
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
