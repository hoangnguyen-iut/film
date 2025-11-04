import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from surprise import SVD, Dataset, Reader
from surprise.model_selection import train_test_split
from django.db import connection
import pickle
import os
from pathlib import Path
from .models import Movie, Rating, Watchlist
from django.contrib.auth.models import User


class HybridRecommender:
    def __init__(self):
        self.movies_df = None
        self.ratings_df = None
        self.tfidf_vectorizer = None
        self.tfidf_matrix = None
        self.content_similarity = None
        self.svd_model = None
        self.cache_dir = Path('recommender/cache')
        self.cache_dir.mkdir(exist_ok=True)
        
        # Load data and build models
        self._load_data()
        self._build_content_model()
        self._build_collaborative_model()
    
    def _load_data(self):
        """Load data from database using pandas"""
        print("Loading data from database...")
        
        # Load movies
        movies_query = """
        SELECT id, title, genre, overview, tmdb_id 
        FROM recommender_movie
        """
        self.movies_df = pd.read_sql_query(movies_query, connection)
        
        # Load ratings
        ratings_query = """
        SELECT id, user_id, movie_id, rating, timestamp 
        FROM recommender_rating
        """
        self.ratings_df = pd.read_sql_query(ratings_query, connection)
        
        # Load watchlist
        watchlist_query = """
        SELECT id, user_id, movie_id, added_at 
        FROM recommender_watchlist
        """
        self.watchlist_df = pd.read_sql_query(watchlist_query, connection)
        
        print(f"Loaded {len(self.movies_df)} movies, {len(self.ratings_df)} ratings, and {len(self.watchlist_df)} watchlist entries")
    
    def _build_content_model(self):
        """Build content-based model using TF-IDF on genre + overview"""
        cache_file = self.cache_dir / 'content_model.pkl'
        
        if cache_file.exists():
            print("Loading cached content model...")
            with open(cache_file, 'rb') as f:
                cache_data = pickle.load(f)
                self.tfidf_vectorizer = cache_data['vectorizer']
                self.tfidf_matrix = cache_data['matrix']
                self.content_similarity = cache_data['similarity']
            return
        
        print("Building content-based model...")
        
        # Combine genre and overview for TF-IDF
        self.movies_df['content'] = self.movies_df['genre'].fillna('') + ' ' + self.movies_df['overview'].fillna('')
        
        # Create TF-IDF vectorizer
        self.tfidf_vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=5000,
            ngram_range=(1, 2)
        )
        
        # Fit and transform
        self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(self.movies_df['content'])
        
        # Compute cosine similarity
        self.content_similarity = cosine_similarity(self.tfidf_matrix, self.tfidf_matrix)
        
        # Cache the model
        cache_data = {
            'vectorizer': self.tfidf_vectorizer,
            'matrix': self.tfidf_matrix,
            'similarity': self.content_similarity
        }
        with open(cache_file, 'wb') as f:
            pickle.dump(cache_data, f)
        
        print("Content-based model built and cached")
    
    def _build_collaborative_model(self):
        """Build collaborative filtering model using SVD"""
        cache_file = self.cache_dir / 'svd_model.pkl'
        
        if cache_file.exists():
            print("Loading cached SVD model...")
            with open(cache_file, 'rb') as f:
                self.svd_model = pickle.load(f)
            return
        
        print("Building collaborative filtering model...")
        
        if len(self.ratings_df) < 100:
            print("Not enough ratings for collaborative filtering, using dummy model")
            self.svd_model = None
            return
        
        # Prepare data for Surprise
        reader = Reader(rating_scale=(1, 5))
        data = Dataset.load_from_df(
            self.ratings_df[['user_id', 'movie_id', 'rating']], 
            reader
        )
        
        # Split data
        trainset, _ = train_test_split(data, test_size=0.2, random_state=42)
        
        # Train SVD model
        self.svd_model = SVD(n_factors=50, n_epochs=20, random_state=42)
        self.svd_model.fit(trainset)
        
        # Cache the model
        with open(cache_file, 'wb') as f:
            pickle.dump(self.svd_model, f)
        
        print("Collaborative filtering model built and cached")
    
    def _get_content_scores(self, movie_idx, rated_movies=None):
        """Get content-based similarity scores for a movie"""
        if rated_movies:
            # If user has rated movies, average similarity to all rated movies
            similarities = []
            for rated_movie_id in rated_movies:
                rated_idx = self.movies_df[self.movies_df['id'] == rated_movie_id].index
                if len(rated_idx) > 0:
                    sim = self.content_similarity[movie_idx, rated_idx[0]]
                    similarities.append(sim)
            return np.mean(similarities) if similarities else 0
        else:
            # Return base similarity (not used in current logic)
            return 0
    
    def _get_collaborative_score(self, user_id, movie_id):
        """Get collaborative filtering prediction for user-movie pair"""
        if self.svd_model is None:
            return 3.0  # Default rating if no model
        
        try:
            prediction = self.svd_model.predict(user_id, movie_id)
            return prediction.est
        except:
            return 3.0  # Default if prediction fails
    
    def _get_popular_movies(self, n=10):
        """Get popular movies based on number of ratings"""
        if len(self.ratings_df) == 0:
            # If no ratings, return random movies
            return self.movies_df.sample(n=n)['id'].tolist()
        
        movie_ratings_count = self.ratings_df.groupby('movie_id').size()
        movie_avg_rating = self.ratings_df.groupby('movie_id')['rating'].mean()
        
        # Combine count and average rating for popularity score
        popularity = (movie_ratings_count * movie_avg_rating).sort_values(ascending=False)
        
        # Get top n movie IDs
        top_movie_ids = popularity.head(n).index.tolist()
        return top_movie_ids
    
    def _is_in_watchlist(self, user_id, movie_id):
        """Check if movie is in user's watchlist"""
        if hasattr(self, 'watchlist_df') and self.watchlist_df is not None:
            return ((self.watchlist_df['user_id'] == user_id) & 
                    (self.watchlist_df['movie_id'] == movie_id)).any()
        return False
    
    def get_recommendations(self, user_id, n=10):
        """
        Get hybrid recommendations for a user
        
        Args:
            user_id: ID of the user
            n: Number of recommendations to return
            
        Returns:
            List of movie IDs
        """
        print(f"Getting recommendations for user {user_id}...")
        
        # Check if user exists and has ratings
        user_ratings = self.ratings_df[self.ratings_df['user_id'] == user_id]
        
        # Cold start: return popular movies if user has no ratings
        if len(user_ratings) == 0:
            print(f"User {user_id} has no ratings, returning popular movies")
            return self._get_popular_movies(n)
        
        # Get movies the user has rated
        rated_movie_ids = user_ratings['movie_id'].tolist()
        
        # Get movies not rated by user
        unrated_movies = self.movies_df[~self.movies_df['id'].isin(rated_movie_ids)]
        
        recommendations = []
        
        for _, movie in unrated_movies.iterrows():
            movie_id = movie['id']
            movie_idx = movie.name
            
            # Content-based score
            content_score = self._get_content_scores(movie_idx, rated_movie_ids)
            
            # Collaborative score
            collab_score = self._get_collaborative_score(user_id, movie_id)
            
            # Hybrid score (normalize content_score to 0-5 scale)
            content_score_normalized = content_score * 5  # Assuming similarity is 0-1
            hybrid_score = 0.4 * content_score_normalized + 0.6 * collab_score
            
            # Boost score if movie is in user's watchlist (+0.2 points)
            if self._is_in_watchlist(user_id, movie_id):
                hybrid_score += 0.2
                print(f"Boosted score for movie {movie_id} (in watchlist): {hybrid_score}")
            
            recommendations.append({
                'movie_id': movie_id,
                'content_score': content_score_normalized,
                'collab_score': collab_score,
                'hybrid_score': hybrid_score,
                'in_watchlist': self._is_in_watchlist(user_id, movie_id)
            })
        
        # Sort by hybrid score and return top n
        recommendations.sort(key=lambda x: x['hybrid_score'], reverse=True)
        top_recommendations = [rec['movie_id'] for rec in recommendations[:n]]
        
        print(f"Generated {len(top_recommendations)} recommendations")
        return top_recommendations


# Unit test
def test_recommender():
    """Unit test for the recommender engine"""
    print("Running unit test...")
    
    try:
        recommender = HybridRecommender()
        
        # Test with user_id=1
        recommendations = recommender.get_recommendations(user_id=1, n=10)
        
        print(f"Recommendations for user 1: {recommendations}")
        
        # Verify we get a list of movie IDs
        assert isinstance(recommendations, list), "Recommendations should be a list"
        assert len(recommendations) <= 10, "Should return at most 10 recommendations"
        
        if len(recommendations) > 0:
            assert all(isinstance(movie_id, (int, np.integer)) for movie_id in recommendations), \
                "All recommendations should be movie IDs"
        
        print("Unit test passed!")
        return recommendations
        
    except Exception as e:
        print(f"Unit test failed: {e}")
        return []


if __name__ == "__main__":
    # Run unit test when script is executed directly
    test_recommender()
