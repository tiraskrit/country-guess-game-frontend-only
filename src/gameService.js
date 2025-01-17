import { format, isSameDay } from 'date-fns';
import { ImageProcessor } from './imageProcessor';

String.prototype.hashCode = function() {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
      const char = this.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
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
    this.cachedUtcTime = null;
    this.lastUtcFetch = null;
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

  async getUtcDate() {
    // Check if we have a recent cache (within last minute)
    const now = Date.now();
    if (this.cachedUtcTime && this.lastUtcFetch && 
        (now - this.lastUtcFetch) < 60000) {
      // Return cached time plus elapsed time
      return new Date(this.cachedUtcTime.getTime() + (now - this.lastUtcFetch));
    }

    try {
      const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=UTC');
      if (!response.ok) throw new Error('Failed to fetch UTC time');
      
      const data = await response.json();
      const utcDate = new Date(data.dateTime);
      
      // Cache the result
      this.cachedUtcTime = utcDate;
      this.lastUtcFetch = now;
      
      return utcDate;
    } catch (error) {
      console.warn("Failed to fetch UTC time, falling back to local UTC:", error);
      // Fallback to local UTC time
      return new Date(new Date().toISOString());
    }
  }

  // Add back getCurrentDate for compatibility
  async getCurrentDate() {
    const utcDate = await this.getUtcDate();
    return utcDate.toISOString().split('T')[0];
  }

  async getCurrentUtcDateString() {
    return this.getCurrentDate(); // Reuse getCurrentDate implementation
  }

  async scheduleNextReset() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    const utcNow = await this.getUtcDate();
    const nextUtcMidnight = new Date(Date.UTC(
      utcNow.getUTCFullYear(),
      utcNow.getUTCMonth(),
      utcNow.getUTCDate() + 1
    ));
    
    const timeUntilReset = nextUtcMidnight.getTime() - utcNow.getTime();

    this.resetTimer = setTimeout(async () => {
      this.lastResetDate = null;
      this.currentCountry = null;
      localStorage.removeItem('daily_country_cache');

      await this.loadCountries();
      if (this.onReset) {
        this.onReset();
      }

      this.scheduleNextReset();
    }, timeUntilReset);
  }

  async getNextResetTime() {
    const utcNow = await this.getUtcDate();
    const nextUtcMidnight = new Date(Date.UTC(
      utcNow.getUTCFullYear(),
      utcNow.getUTCMonth(),
      utcNow.getUTCDate() + 1
    ));
    return Math.floor((nextUtcMidnight.getTime() - utcNow.getTime()) / 1000);
  }

  async loadCache() {
    try {
      const cache = localStorage.getItem('daily_country_cache');
      if (cache) {
        const { date, country } = JSON.parse(cache);
        const utcNow = await this.getUtcDate();
        if (isSameDay(new Date(date), utcNow)) {
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
        date: await this.getCurrentDate(),
        country: countryData
      };
      localStorage.setItem('daily_country_cache', JSON.stringify(cache));
    } catch (error) {
      console.warn("Failed to save cache to localStorage:", error);
    }
  }

  async getDailyCountry() {
    const currentDate = await this.getCurrentDate();
    
    if (this.lastResetDate !== currentDate) {
      const cachedCountry = await this.loadCache();
      if (cachedCountry) {
        this.currentCountry = cachedCountry;
      } else {
        const dateNum = parseInt(currentDate.replace(/-/g, ''));
        const index = dateNum % this.countryPool.length;
        const country = this.countryPool[index];
        
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
      nextReset: await this.getNextResetTime(),
      hintText: null,
      hintImage: null,
      playerName: null
    };

    if (correct || hintLevel >= 4) {
      response.imageUrl = country.flagUrl;
      response.playerName = country.name;
      return response;
    }

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