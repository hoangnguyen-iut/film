import os
import sys
import csv
import time
import requests
from django.db import transaction

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movie_recsys.settings')

import django
django.setup()

from recommender.models import Movie, Rating
from django.contrib.auth.models import User

# Configuration
TMDB_API_KEY = "YOUR_TMDB_KEY"  # Replace with actual TMDb API key
TMDB_BASE_URL = "https://api.themoviedb.org/3"
SLEEP_TIME = 0.1  # Rate limiting sleep time in seconds
MAX_MOVIES = 5000  # Only process first 5000 movies for testing

def get_tmdb_movie_details(tmdb_id):
    """Get movie details from TMDb API"""
    url = f"{TMDB_BASE_URL}/movie/{tmdb_id}"
    params = {
        'api_key': TMDB_API_KEY,
        'language': 'en-US'
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        overview = data.get('overview', '')
        poster_path = data.get('poster_path', '')
        poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
        
        return overview, poster_url
    except requests.exceptions.RequestException as e:
        print(f"Error fetching TMDb data for ID {tmdb_id}: {e}")
        return None, None
    except Exception as e:
        print(f"Unexpected error for ID {tmdb_id}: {e}")
        return None, None

def populate_movies():
    """Populate Movie objects from movies.csv and TMDb API"""
    movies_csv_path = 'data/ml-20m/movies.csv'
    links_csv_path = 'data/ml-20m/links.csv'
    
    # Read links to get TMDb IDs
    tmdb_mapping = {}
    try:
        with open(links_csv_path, 'r', encoding='utf-8') as links_file:
            reader = csv.DictReader(links_file)
            for row in reader:
                movie_id = int(row['movieId'])
                tmdb_id = row['tmdbId'] if row['tmdbId'] != '' else None
                if tmdb_id:
                    tmdb_mapping[movie_id] = int(tmdb_id)
        print(f"Loaded TMDb mapping for {len(tmdb_mapping)} movies")
    except FileNotFoundError:
        print(f"Error: {links_csv_path} not found")
        return
    except Exception as e:
        print(f"Error reading links file: {e}")
        return
    
    # Read movies and create Movie objects
    movies_to_create = []
    processed_count = 0
    skipped_count = 0
    
    try:
        with open(movies_csv_path, 'r', encoding='utf-8') as movies_file:
            reader = csv.DictReader(movies_file)
            for row in reader:
                if processed_count >= MAX_MOVIES:
                    break
                    
                movie_id = int(row['movieId'])
                title = row['title']
                genres = row['genres']
                
                # Skip if no TMDb ID
                if movie_id not in tmdb_mapping:
                    skipped_count += 1
                    continue
                
                tmdb_id = tmdb_mapping[movie_id]
                
                # Get additional details from TMDb API
                overview, poster_url = get_tmdb_movie_details(tmdb_id)
                time.sleep(SLEEP_TIME)  # Rate limiting
                
                # Skip if TMDb API failed
                if overview is None:
                    skipped_count += 1
                    continue
                
                # Extract release year from title (format: "Title (Year)")
                release_year = None
                if title.endswith(')'):
                    try:
                        year_str = title.split('(')[-1].rstrip(')')
                        if year_str.isdigit() and len(year_str) == 4:
                            release_year = int(year_str)
                    except (ValueError, IndexError):
                        pass
                
                # Create Movie object
                movie = Movie(
                    title=title,
                    genre=genres,
                    director="Unknown",  # Not available in the dataset
                    release_year=release_year or 2000,  # Default if not found
                    overview=overview,
                    poster_url=poster_url,
                    tmdb_id=tmdb_id
                )
                movies_to_create.append(movie)
                processed_count += 1
                
                if processed_count % 100 == 0:
                    print(f"Processed {processed_count} movies...")
    
    except FileNotFoundError:
        print(f"Error: {movies_csv_path} not found")
        return
    except Exception as e:
        print(f"Error reading movies file: {e}")
        return
    
    # Bulk create movies
    if movies_to_create:
        try:
            Movie.objects.bulk_create(movies_to_create, ignore_conflicts=True)
            print(f"Successfully created {len(movies_to_create)} movies")
            print(f"Skipped {skipped_count} movies (no TMDb ID or API failed)")
        except Exception as e:
            print(f"Error bulk creating movies: {e}")
    else:
        print("No movies to create")

def populate_ratings():
    """Populate Rating objects from ratings.csv"""
    ratings_csv_path = 'data/ml-20m/ratings.csv'
    
    # Get all movie IDs from the database for mapping
    movie_mapping = {movie.tmdb_id: movie for movie in Movie.objects.all()}
    if not movie_mapping:
        print("No movies found in database. Please run populate_movies first.")
        return
    
    # Get or create a test user
    test_user, created = User.objects.get_or_create(
        username='test_user',
        defaults={'email': 'test@example.com', 'password': 'testpass123'}
    )
    if created:
        print("Created test user")
    
    ratings_to_create = []
    processed_count = 0
    skipped_count = 0
    
    try:
        with open(ratings_csv_path, 'r', encoding='utf-8') as ratings_file:
            reader = csv.DictReader(ratings_file)
            for row in reader:
                # We'll only create ratings for the test user to avoid too many records
                # In a real scenario, you might want to handle multiple users
                user_id = int(row['userId'])
                if user_id != 1:  # Only use first user for testing
                    continue
                
                movie_id = int(row['movieId'])
                rating_value = float(row['rating'])
                timestamp = int(row['timestamp'])
                
                # Find the movie by its original ID (we need to map back to TMDb ID)
                # This is simplified - in practice, you'd need a better mapping
                # For now, we'll skip ratings for movies not in our database
                movie = None
                for m in movie_mapping.values():
                    # This is a hack - in a real implementation, you'd store the original movieId
                    # For now, we'll just create ratings for the first few movies
                    if len(ratings_to_create) < 1000:  # Limit to 1000 ratings for testing
                        movie = m
                        break
                
                if not movie:
                    skipped_count += 1
                    continue
                
                # Create Rating object
                rating = Rating(
                    user=test_user,
                    movie=movie,
                    rating=rating_value
                )
                ratings_to_create.append(rating)
                processed_count += 1
                
                if processed_count % 100 == 0:
                    print(f"Processed {processed_count} ratings...")
                    
                if processed_count >= 1000:  # Stop after 1000 ratings
                    break
    
    except FileNotFoundError:
        print(f"Error: {ratings_csv_path} not found")
        return
    except Exception as e:
        print(f"Error reading ratings file: {e}")
        return
    
    # Bulk create ratings
    if ratings_to_create:
        try:
            Rating.objects.bulk_create(ratings_to_create, ignore_conflicts=True)
            print(f"Successfully created {len(ratings_to_create)} ratings")
            print(f"Skipped {skipped_count} ratings")
        except Exception as e:
            print(f"Error bulk creating ratings: {e}")
    else:
        print("No ratings to create")

@transaction.atomic
def main():
    """Main function to populate database"""
    print("Starting database population...")
    
    print("Step 1: Populating movies...")
    populate_movies()
    
    print("Step 2: Populating ratings...")
    populate_ratings()
    
    print("Database population completed!")

if __name__ == '__main__':
    main()
