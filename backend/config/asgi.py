import os
from django.core.asgi import get_asgi_application

# Set Django settings module FIRST
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize Django BEFORE importing anything that uses Django models/settings
django_asgi_app = get_asgi_application()

# NOW it's safe to import routing and consumers (they can use Django models)
from channels.routing import ProtocolTypeRouter, URLRouter
from apps.game.routing import websocket_urlpatterns
from apps.game.middleware import JWTAuthMiddleware

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})
