from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

app_name = 'recommender'

urlpatterns = [
    path('', views.home, name='home'),
    path('recommendations/', views.recommendations, name='recommendations'),
    path('movie/<int:movie_id>/rate/', views.rate_movie, name='rate_movie'),
    path('search/', views.search_movie, name='search'),
    path('movie/<int:movie_id>/', views.movie_detail, name='movie_detail'),
    path('login/', auth_views.LoginView.as_view(template_name='registration/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('register/', views.register, name='register'),
    path('profile/', views.profile_view, name='profile'),
    path('watchlist/add/<int:movie_id>/', views.add_to_watchlist, name='add_to_watchlist'),
    # API endpoints for enhanced features
    path('api/search/', views.search_api, name='search_api'),
    path('load-more/<str:category>/', views.load_more, name='load_more'),
]
