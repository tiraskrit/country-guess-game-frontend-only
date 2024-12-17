import { format, isSameDay, startOfTomorrow, differenceInMilliseconds } from 'date-fns';
import { ImageProcessor } from './imageProcessor';
import { Share } from '@capacitor/share';

// Extend String prototype to add hashCode method
String.prototype.hashCode = function() {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
      const char = this.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };

class GameService {
  constructor() {
    this.countryPool = [];
    this.currentCountry = null;
    this.lastResetDate = null;
    this.resetTimer = null;
    this.onReset = null;
  }

  async initialize(onReset) {
    this.onReset = onReset;
    await this.loadCountries();
    await this.scheduleNextReset();
  }

  async loadCountries(retryCount = 0, maxRetries = 3) {
    try {
      if (this.countryPool.length === 0) {
        const response = await fetch('https://restcountries.com/v3.1/all');
        if (!response.ok) throw new Error('Failed to fetch countries');
    
        const countries = await response.json();
        this.countryPool = countries.filter(country => 
          country.population > 500000 && country.cca2
        );
      }
      await this.getDailyCountry();
    } catch (error) {
      console.error('Failed to load countries!', error);
      if (retryCount < maxRetries) {
        console.warn(`Retrying loadCountries... (${retryCount + 1}/${maxRetries})`);
        setTimeout(() => this.loadCountries(retryCount + 1, maxRetries), 1000);
      } else {
        console.error("Max retries reached for loading countries.");
      }
    }
  }  
  

  scheduleNextReset() {
    // Clear existing timer
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    // Schedule next reset at midnight
    const tomorrow = startOfTomorrow();
    const timeUntilReset = differenceInMilliseconds(tomorrow, new Date());

    this.resetTimer = setTimeout(async () => {
      this.lastResetDate = null;
      this.currentCountry = null;
      localStorage.removeItem('daily_country_cache');
      
      // Reload countries and notify component
      await this.loadCountries();
      if (this.onReset) {
        this.onReset();
      }
      
      // Schedule next reset
      this.scheduleNextReset();
    }, timeUntilReset);
  }

  getCurrentDate() {
    return format(new Date(), 'yyyy-MM-dd');
  }

  getNextResetTime() {
    return Math.floor((startOfTomorrow().getTime() - new Date().getTime()) / 1000);
  }

  loadCache() {
    try {
        const cache = localStorage.getItem('daily_country_cache');
        if (cache) {
            const { date, country } = JSON.parse(cache);
            if (isSameDay(new Date(date), new Date())) {
                return country;
            }
        }
    } catch (error) {
        console.warn("Failed to load cache from localStorage:", error);
    }
    return null;
}

async saveCache(countryData) {
    try {
        const cache = {
            date: this.getCurrentDate(),
            country: countryData
        };
        localStorage.setItem('daily_country_cache', JSON.stringify(cache));
    } catch (error) {
        console.warn("Failed to save cache to localStorage:", error);
    }
}

  async getDailyCountry() {
    const currentDate = this.getCurrentDate();
    
    if (this.lastResetDate !== currentDate) {
      // Try loading from cache first
      const cachedCountry = this.loadCache();
      if (cachedCountry) {
        this.currentCountry = cachedCountry;
      } else {
        // Select new country based on today's date as seed
        const dateNum = parseInt(currentDate.replace(/-/g, ''));
        const index = dateNum % this.countryPool.length;
        const country = this.countryPool[index];
        
        // Process images
        const flagUrl = country.flags.png;
        const blurredImage = await ImageProcessor.blurImage(flagUrl);
        
        this.currentCountry = {
          name: country.name.common,
          flagUrl: flagUrl,
          blurredImage: blurredImage,
          capital: country.capital?.[0] || 'N/A',
          continent: country.region || 'Unknown',
          population: country.population || 0
        };
        
        await this.saveCache(this.currentCountry);
      }
      this.lastResetDate = currentDate;
    }
    return this.currentCountry;
  }

  async checkGuess(guess, hintLevel) {
    const country = await this.getDailyCountry();
    const correct = guess.toLowerCase() === country.name.toLowerCase();
    
    const response = {
      correct,
      hintLevel,
      nextReset: this.getNextResetTime(),
      hintText: null,
      hintImage: null,
      playerName: null
    };

    // Show original flag and country name for game over scenarios
    if (correct || hintLevel >= 4) {
      response.imageUrl = country.flagUrl;
      response.playerName = country.name;
      return response;
    }

    // Hint progression
    if (!correct && hintLevel < 4) {
        response.imageUrl = hintLevel === 0 ? country.flagUrl : country.flagUrl;
      switch (hintLevel) {
        case 0:
          response.hintText = "Unblurred Flag";
          break;
        case 1:
          response.hintText = `Population: ${country.population.toLocaleString()}`;
          break;
        case 2:
          response.hintText = `Continent: ${country.continent}`;
          break;
        case 3:
          response.hintText = `Capital: ${country.capital}`;
          break;
      }
    }

    return response;
  }

  cleanup() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
  }
}

export const gameService = new GameService();