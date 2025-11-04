# Movie Recommender System

A Django-based movie recommendation system that provides personalized movie suggestions using hybrid filtering (content-based + collaborative filtering).

## Features

- **Hybrid Recommendation Engine**: Combines content-based and collaborative filtering
- **User Authentication**: Registration, login, and protected views
- **Movie Search**: Search by title and filter by genre
- **Rating System**: Rate movies from 1-5 stars
- **Responsive Design**: Bootstrap 5 with custom CSS
- **RESTful API**: AJAX rating system
- **Unit Tests**: Comprehensive test coverage

## Technology Stack

- **Backend**: Django 4.2, Python 3.11
- **Frontend**: Bootstrap 5, JavaScript
- **Database**: SQLite (development), PostgreSQL (production)
- **ML Libraries**: scikit-learn, scikit-surprise, pandas, numpy
- **Deployment**: Heroku, Gunicorn

## Project Structure

```
movie_recsys/
├── recommender/          # Main Django app
│   ├── models.py        # Movie and Rating models
│   ├── views.py         # Views for recommendations, search, rating
│   ├── forms.py         # Rating form
│   ├── urls.py          # App URL routing
│   ├── admin.py         # Django admin configuration
│   ├── recommender_engine.py  # Hybrid recommendation engine
│   └── tests.py         # Unit tests
├── movie_recsys/        # Project settings
├── templates/           # HTML templates
├── static/             # CSS, JavaScript, images
├── scripts/            # Database population scripts
├── data/               # MovieLens dataset
└── tests/              # Unit tests
```

## Installation & Setup

### Prerequisites

- Python 3.11+
- pip
- virtualenv (recommended)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd film
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run migrations**
   ```bash
   python manage.py migrate
   ```

5. **Create superuser (optional)**
   ```bash
   python manage.py createsuperuser
   ```

6. **Populate database with sample data**
   ```bash
   # Download MovieLens 20M dataset to data/ml-20m/
   # Update TMDb API key in scripts/populate_db.py
   python scripts/populate_db.py
   ```

7. **Run development server**
   ```bash
   python manage.py runserver
   ```

8. **Access the application**
   - Main site: http://localhost:8000
   - Admin panel: http://localhost:8000/admin

### Running Tests

```bash
python manage.py test tests/
```

## Deployment to Heroku

### Prerequisites

- Heroku CLI installed
- Heroku account

### Deployment Steps

1. **Login to Heroku**
   ```bash
   heroku login
   ```

2. **Create Heroku app**
   ```bash
   heroku create your-app-name
   ```

3. **Set environment variables**
   ```bash
   heroku config:set DEBUG=False
   heroku config:set SECRET_KEY=your-secret-key
   heroku config:set DISABLE_COLLECTSTATIC=1
   ```

4. **Deploy to Heroku**
   ```bash
   git push heroku main
   ```

5. **Run migrations on Heroku**
   ```bash
   heroku run python manage.py migrate
   ```

6. **Create superuser on Heroku**
   ```bash
   heroku run python manage.py createsuperuser
   ```

7. **Open the application**
   ```bash
   heroku open
   ```

### Environment Variables

For production, set these environment variables:

```bash
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=your-app.herokuapp.com
DATABASE_URL=postgres://...
```

## API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/` | GET | Home page (search) | No |
| `/recommendations/` | GET | Personalized recommendations | Yes |
| `/search/` | GET | Search movies | No |
| `/movie/<id>/` | GET | Movie details | No |
| `/movie/<id>/rate/` | POST | Rate a movie | Yes |
| `/login/` | GET/POST | User login | No |
| `/logout/` | POST | User logout | Yes |
| `/register/` | GET/POST | User registration | No |

## Recommendation Algorithm

The hybrid recommender combines:

1. **Content-Based Filtering** (40% weight)
   - TF-IDF vectorization of movie genres and overviews
   - Cosine similarity between movies

2. **Collaborative Filtering** (60% weight)
   - SVD (Singular Value Decomposition) on user ratings
   - Matrix factorization for user-movie predictions

3. **Cold Start Handling**
   - Returns popular movies for new users
   - Popularity based on rating count and average rating

## Data Sources

- **MovieLens 20M Dataset**: Movie metadata and ratings
- **TMDb API**: Movie posters and overviews

## Configuration

### TMDb API Setup

1. Get API key from [TMDb](https://www.themoviedb.org/settings/api)
2. Update `TMDB_API_KEY` in `scripts/populate_db.py`
3. Run population script

### Database Configuration

- **Development**: SQLite
- **Production**: PostgreSQL (auto-configured on Heroku)

## Development

### Adding New Features

1. Create migrations for model changes:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

2. Run tests:
   ```bash
   python manage.py test
   ```

3. Check code style:
   ```bash
   flake8 .
   ```

### Customizing Recommendations

Modify `recommender/recommender_engine.py`:
- Adjust hybrid weights (currently 40% content, 60% collaborative)
- Change TF-IDF parameters
- Modify SVD hyperparameters

## Troubleshooting

### Common Issues

1. **TMDb API Rate Limits**
   - Script includes 0.1s delay between requests
   - Handle API failures gracefully

2. **Memory Issues with Large Datasets**
   - Script processes only first 5000 movies for testing
   - Increase `MAX_MOVIES` in population script for production

3. **Heroku Deployment Failures**
   - Check build logs: `heroku logs --tail`
   - Verify requirements.txt includes all dependencies
   - Ensure Procfile is in root directory

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and add tests
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- MovieLens dataset for movie ratings
- TMDb for movie metadata and posters
- Django community for excellent documentation
