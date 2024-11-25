from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
import requests
import random
import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image
import json
import os
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__)
CORS(app)

CACHE_FILE = 'daily_country_cache.json'

class DailyCountryGame:
    def __init__(self):
        self.current_country = None
        self.blurred_flag = None
        self.map_image = None
        self.last_reset_date = None
        self.country_pool = []
        
    def _get_current_date(self):
        """Get current UTC date string"""
        return datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    def _load_cache(self):
        """Load cached country data if it exists"""
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r') as f:
                    cache = json.load(f)
                    cached_date = cache.get('date')

                    if cached_date == self._get_current_date():
                        return cache.get('country')
                    else:
                        return None
            except (json.JSONDecodeError, KeyError):
                return None
        return None
    
    def _save_cache(self, country_data):
        """Save country data to cache"""
        cache = {
            'date': self._get_current_date(),
            'country': country_data
        }
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache, f)
    
    def _fetch_country_pool(self):
        try:
            response = requests.get('https://restcountries.com/v3.1/all')
            if response.status_code == 200:
                countries = response.json()
                # Filter out very small countries or territories
                self.country_pool = [
                    country for country in countries 
                    if country.get('population', 0) > 500000
                    and country.get('cca2')  # Ensure country code exists
                ]
                
                # Generate list of country names for autocomplete with error handling
                try:
                    country_names = [country['name']['common'] for country in self.country_pool]
                    with open('country_names.json', 'w', encoding='utf-8') as f:
                        json.dump(country_names, f, ensure_ascii=False)
                except Exception as write_error:
                    print(f"Error writing country names: {write_error}")
                
                # Shuffle the pool using today's date as seed
                today = self._get_current_date()
                random.seed(today)
                random.shuffle(self.country_pool)
            else:
                print("Failed to fetch countries")
                self._load_backup_countries()
        except Exception as e:
            print(f"Error fetching country pool: {str(e)}")
            self._load_backup_countries()

    def _process_images(self):
        """Process and blur flag image while maintaining original dimensions"""
        try:
            flag_url = self.current_country.get('flag_url')
            
            if not flag_url:
                raise ValueError("No flag URL available")
            
            response = requests.get(flag_url, stream=True, verify=True, timeout=10)
            
            if response.status_code != 200:
                raise ValueError(f"Failed to fetch image. Status code: {response.status_code}")
                
            # Read image content and create PIL Image
            img = Image.open(BytesIO(response.content))
            
            # Convert to RGB while preserving original size
            img = img.convert('RGB')
            
            # Convert to numpy array while maintaining dimensions
            img_array = np.array(img)
            
            # Create blurred version while maintaining size
            blurred = cv2.GaussianBlur(img_array, (99, 99), 0)
            
            def img_to_base64(img_array):
                # Create PIL Image while preserving dimensions
                img = Image.fromarray(img_array.astype('uint8'))
                buffered = BytesIO()
                # Save with original size
                img.save(buffered, format="PNG", optimize=True)
                return f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode()}"
            
            # Store both versions
            self.current_country['blurred_image'] = img_to_base64(blurred)
            self.current_country['unblurred_image'] = img_to_base64(img_array)
            
        except Exception as e:
            self._use_placeholder_image()


    def _load_backup_countries(self):
        """Load backup country data in case API fails"""
        self.country_pool = [
            {
                'name': {'common': 'United States'},
                'flags': {'png': 'https://flagcdn.com/w320/us.png'},
                'capital': ['Washington, D.C.'],
                'region': 'Americas',
                'population': 331002651,
                'maps': {'googleMaps': 'https://goo.gl/maps/e8M246zY4AFCf36n9'}
            }
        ]
    
    def get_daily_country(self):
        """Get or generate country for current day"""
        current_date = self._get_current_date()
        
        # Check if we need to reset
        if self.last_reset_date != current_date:
            # Try to load from cache first
            cached_country = self._load_cache()
            if cached_country:
                self.current_country = cached_country
            else:
                # Fetch country pool if it's empty
                if not self.country_pool:
                    self._fetch_country_pool()
                
                # Check if country pool is still empty after fetch
                if not self.country_pool:
                    self._load_backup_countries()
                
                # Ensure we have a country in the pool
                if self.country_pool:
                    country = self.country_pool[0]
                    self.current_country = {
                        'name': country['name']['common'],
                        'flag_url': country['flags']['png'],
                        'capital': country['capital'][0] if country.get('capital') else 'N/A',
                        'continent': country.get('region', 'Unknown'),
                        'population': country.get('population', 0),
                        'map_url': country['maps']['googleMaps']
                    }
                    print(self.current_country['flag_url'])
                    self._save_cache(self.current_country)
                else:
                    print("Error: No country available in pool or backup.")
                    return None

            # Process flag and map images 
            if self.current_country:
                self._process_images()
                self.last_reset_date = current_date
        
        return self.current_country

    def _use_placeholder_image(self):
        """Use placeholder if image processing fails"""
        self.current_country['blurred_image'] = "placeholder_base64"
        self.current_country['unblurred_image'] = "placeholder_base64"

    def get_next_reset_time(self):
        """Get time until next reset"""
        now = datetime.now(timezone.utc)
        tomorrow = (now + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        return int((tomorrow - now).total_seconds())
    
    def daily_check(self):
        """Check if the cache needs to be reset and load new data if required."""
        current_date = self._get_current_date()
        if self.last_reset_date != current_date:
            self.current_country = None  # Invalidate current country data

game = DailyCountryGame()

@app.route('/api/game-state', methods=['GET'])
def get_game_state():
    country = game.get_daily_country()
    next_reset = game.get_next_reset_time()
    
    return jsonify({
        'blurred_image': country['blurred_image'],
        'game_id': hash(country['name']),
        'next_reset': next_reset,
        'current_date': game.last_reset_date,
    })

@app.route('/api/player-names', methods=['GET'])
def get_country_names():
    try:
        with open('country_names.json', 'r') as f:
            country_names = json.load(f)
        return jsonify(country_names)
    except FileNotFoundError:
        # Create the file with an empty list if it doesn't exist
        with open('country_names.json', 'w') as f:
            json.dump([], f)
        return jsonify([])

@app.route('/api/guess', methods=['POST'])
def check_guess():
    data = request.get_json()
    guess = data.get('guess', '').lower()
    current_hint_level = data.get('hint_level', 0)
    
    if not game.current_country:
        return jsonify({'error': 'No active game'}), 400
    
    correct = guess == game.current_country['name'].lower()
    
    response = {
        'correct': correct,
        'hint_level': current_hint_level,
        'next_reset': game.get_next_reset_time(),
        'hint_text': None,
        'hint_image': None,
        'player_name': None
    }
    
    # Show original flag and country name for game over scenarios
    if correct or current_hint_level >= 4:
        response['hint_image'] = None
        response['image_url'] = game.current_country['flag_url']
        response['player_name'] = game.current_country['name']
        
        resp = make_response(jsonify(response))
        return resp
    
    # Hint progression
    if not correct and current_hint_level < 4:
        if current_hint_level == 0:
            response['hint_text'] = "Unblurred Flag"
            response['hint_image'] = game.current_country['unblurred_image']
        elif current_hint_level == 1:
            response['hint_text'] = f"Population: {game.current_country['population']:,}"
            response['hint_image'] = game.current_country['unblurred_image']
        elif current_hint_level == 2:
            response['hint_text'] = f"Continent: {game.current_country['continent']}"
            response['hint_image'] = game.current_country['unblurred_image']
        elif current_hint_level == 3:
            response['hint_text'] = f"Capital: {game.current_country['capital']}"
            response['hint_image'] = game.current_country['flag_url']
    
    return jsonify(response)

if __name__ == '__main__':
    # Start a scheduler to run daily_check() every 24 hours
    scheduler = BackgroundScheduler()
    scheduler.add_job(game.daily_check, 'interval', days=1)
    scheduler.start()
    app.run()