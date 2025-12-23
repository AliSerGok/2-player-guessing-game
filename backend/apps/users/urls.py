from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, UserProfileView, LogoutView,
    TransactionHistoryView, DepositView, WithdrawView,
    AdminUsersListView, AdminUserDetailView, AdminTransactionsListView
)

app_name = 'users'

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Wallet endpoints
    path('wallet/transactions/', TransactionHistoryView.as_view(), name='transaction_history'),
    path('wallet/deposit/', DepositView.as_view(), name='deposit'),
    path('wallet/withdraw/', WithdrawView.as_view(), name='withdraw'),

    # Admin endpoints
    path('admin/users/', AdminUsersListView.as_view(), name='admin_users_list'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('admin/transactions/', AdminTransactionsListView.as_view(), name='admin_transactions_list'),
]
