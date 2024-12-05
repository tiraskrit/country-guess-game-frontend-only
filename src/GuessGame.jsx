import { useState, useEffect } from 'react';
import { Share2, RefreshCw, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AutocompleteInput from '@/components/ui/AutocompleteInput';
import { API_URL } from './api.js';
import RulesDialog from '@/components/RulesDialog';
import { gameService } from './gameService';

const GuessGame = () => {
  const [gameState, setGameState] = useState({
    currentImage: '',
    hintText: null,
    hintLevel: 0,
    guesses: [],
    gameOver: false,
    gameId: null,
    message: '',
    loading: true,
    nextReset: null,
    currentDate: null,
    playerName: null
  });
  
  const [guess, setGuess] = useState('');
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [showRules, setShowRules] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [error, setError] = useState(false);

  const formatTimeUntilReset = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  useEffect(() => {
    const checkGameStatus = () => {
      const gameStatus = localStorage.getItem(`gameStatus_${gameState.currentDate}`);
      if (gameStatus === 'completed') {
        setIsBlocked(true);
        
        // Restore previous game state for sharing
        const stored = localStorage.getItem('footballGuessGame');
        if (stored) {
          const { guesses, playerName } = JSON.parse(stored);
          setGameState(prev => ({
            ...prev,
            guesses,
            playerName,
            gameOver: true
          }));
        }
      }
    };
    
    if (gameState.currentDate) {
      checkGameStatus();
    }
  }, [gameState.currentDate]);

  useEffect(() => {
    const initGame = async () => {
        try {
            await gameService.initialize(() => fetchGameState());
            fetchGameState();
        } catch (err) {
            console.error("Game initialization failed:", err);
            setGameState(prev => ({
                ...prev,
                message: 'Critical error initializing game.',
                loading: false
            }));
        }
    };

    initGame();

    return () => {
        gameService.cleanup();
    };
}, []);

  
  const checkStoredGame = () => {
    const stored = localStorage.getItem('footballGuessGame');
    if (stored) {
      const { date, guesses, hintLevel, gameOver, playerName } = JSON.parse(stored);
      if (date === gameState.currentDate) {
        setGameState(prev => ({
          ...prev,
          guesses,
          hintLevel,
          gameOver,
          playerName
        }));
        return true;
      }
    }
    return false;
  };

  const saveGameState = () => {
    const toStore = {
      date: gameState.currentDate,
      guesses: gameState.guesses,
      hintLevel: gameState.hintLevel,
      gameOver: gameState.gameOver,
      playerName: gameState.playerName
    };
    localStorage.setItem('footballGuessGame', JSON.stringify(toStore));
    
    if (gameState.gameOver) {
      localStorage.setItem(`gameStatus_${gameState.currentDate}`, 'completed');
      setIsBlocked(true);
    }
  };
  
  const fetchGameState = async () => {
    setGameState(prev => ({ ...prev, loading: true }));

    try {
        const country = await gameService.getDailyCountry();

        setGameState(prev => ({
            ...prev,
            currentImage: country.blurredImage,
            gameId: country.name.hashCode?.() || Math.random(),
            nextReset: gameService.getNextResetTime(),
            currentDate: gameService.getCurrentDate(),
            loading: false,
            message: null
        }));

        checkStoredGame();

    } catch (error) {
        console.error("Error in fetchGameState:", error);

        if (error.message === 'Failed to fetch countries' && !localStorage.getItem('daily_country_cache')) {
            console.warn("Game is loading with default settings.");
            await gameService.loadCountries();
            fetchGameState(); // Retry on recoverable error
        } else {
            setGameState(prev => ({
                ...prev,
                message: 'Loading game. Please wait or try refreshing the page.',
                loading: false
            }));
        }
    }
};


  const getImageSource = (imageData) => {
    if (!imageData) return '';
    // If it's a full URL
    if (imageData.startsWith('http')) {
      return imageData;
    }
    // If it's already a data URL
    if (imageData.startsWith('data:image')) {
      return imageData;
    }
    // If it's a base64 string
    return `data:image/jpeg;base64,${imageData}`;
  };

  
  const fetchPlayerNames = async () => {
    try {
      const response = await fetch('https://restcountries.com/v3.1/all');
      const countries = await response.json();
      const names = countries
        .filter(country => country.population > 500000 && country.cca2)
        .map(country => country.name.common)
        .sort();
      setPlayers(names);
      setFilteredPlayers(names);
    } catch (error) {
      console.error('Error fetching player names:', error);
    }
  };

  const handleGuess = async (e) => {
    e.preventDefault();
    
    if (isBlocked) {
      setGameState(prev => ({
        ...prev,
        message: 'You\'ve already completed today\'s game. Come back tomorrow!'
      }));
      return;
    }
    
    if (!guess.trim()) return;
    
    try {
      const data = await gameService.checkGuess(guess.trim(), gameState.hintLevel);
      
      const newGuesses = [...gameState.guesses, {
        guess: guess,
        correct: data.correct,
        hintLevel: gameState.hintLevel
      }];
      
      if (data.correct) {
        setGameState(prev => ({
          ...prev,
          guesses: newGuesses,
          gameOver: true,
          currentImage: data.imageUrl,
          playerName: data.playerName,
          message: 'Congratulations! You got it right!'
        }));
      } else {
        if (gameState.hintLevel >= 4) {
          setGameState(prev => ({
            ...prev,
            guesses: newGuesses,
            gameOver: true,
            currentImage: data.imageUrl,
            playerName: data.playerName,
            message: 'Game Over! Try again tomorrow!'
          }));
        } else {
          setGameState(prev => ({
            ...prev,
            guesses: newGuesses,
            hintLevel: prev.hintLevel + 1,
            currentImage: data.imageUrl,
            hintText: data.hintText,
            message: 'Wrong guess! Here\'s your next hint:'
          }));
        }
      }
      
      setGuess('');
    } catch (error) {
      console.error('Error submitting guess:', error);
      setGameState(prev => ({
        ...prev,
        message: 'Error submitting guess'
      }));
    }
  };

  const shareResult = () => {
    const scoreDisplay = gameState.guesses.map(g => 
      g.correct ? '🟩' : '🟥'
    ).join('');

    let text;
    const lastGuess = gameState.guesses[gameState.guesses.length - 1];

    if (gameState.hintLevel == 0){
      text = `${scoreDisplay} \nI guessed the country in my first try😊, can you beat this? \nCountry Flag Guessing Game: ${gameState.currentDate} \nNext Flag in ${timeUntilReset}! \nPlay the game here: https://daily-flag.netlify.app/`;
    }
    else if (gameState.hintLevel < 4){
      text = `${scoreDisplay} \nIt took me ${gameState.hintLevel + 1} tries to Guess the Country, can you beat this? \nCountry Flag Guessing Game: ${gameState.currentDate} \nNext Flag in ${timeUntilReset}! \nPlay the game here: https://daily-flag.netlify.app/`;
    }
    else {
      if (lastGuess.correct) {
        text = `${scoreDisplay} \nI guessed the country on my last try😫! Can you beat this? \nCountry Flag Guessing Game: ${gameState.currentDate} \nNext Flag in ${timeUntilReset}! \nPlay the game here: https://daily-flag.netlify.app/`;
      } else {
        text = `${scoreDisplay} \nI could not guess the country😞, can you? \nCountry Flag Guessing Game: ${gameState.currentDate} \nNext Flag in ${timeUntilReset}! \nPlay the game here: https://daily-flag.netlify.app/`;
      }
    }
    if (navigator.share) {
      navigator.share({
        text,
        title: 'Country Flag Guessing Game'
      }).catch(() => {
        navigator.clipboard.writeText(text);
        setGameState(prev => ({
          ...prev,
          message: 'Result copied to clipboard!'
        }));
      });
    } else {
      navigator.clipboard.writeText(text);
      setGameState(prev => ({
        ...prev,
        message: 'Result copied to clipboard!'
      }));
    }
  };

  useEffect(() => {
    fetchGameState();
    
    const timer = setInterval(() => {
      if (gameState.nextReset) {
        const newTime = gameState.nextReset - 1;
        setGameState(prev => ({
          ...prev,
          nextReset: newTime
        }));
        setTimeUntilReset(formatTimeUntilReset(newTime));
      }
    }, 1000);
    
    const checkReset = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        fetchGameState();
      }
    }, 60000);
    
    return () => {
      clearInterval(timer);
      clearInterval(checkReset);
    };
  }, []);
  
  useEffect(() => {
    if (gameState.nextReset) {
      setTimeUntilReset(formatTimeUntilReset(gameState.nextReset));
    }
  }, [gameState.nextReset]);
  
  useEffect(() => {
    if (gameState.currentDate) {
      saveGameState();
    }
  }, [gameState.guesses, gameState.hintLevel, gameState.gameOver]);

  useEffect(() => {
    fetchPlayerNames();
  }, []);

  return (
    <div className="min-h-screen h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 p-2 sm:p-4 md:p-6">
      <Card className="w-full max-w-4xl h-full mx-auto shadow-lg border-0 flex flex-col overflow-hidden">
        <CardHeader className="bg-white rounded-t-lg border-b border-gray-200 py-2 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-6">
            <CardTitle className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-800">
              Guess the Country
            </CardTitle>
            <div className="flex items-center text-xs sm:text-sm text-gray-700 bg-gray-100 rounded-full px-3 sm:px-5 py-2 sm:py-3 shadow-sm">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-blue-600" />
              <span>Next flag in: {timeUntilReset}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between p-2 sm:p-4 md:p-6">
          {gameState.loading ? (
            <div className="flex justify-center items-center flex-grow">
              <RefreshCw className="animate-spin text-blue-600 w-8 h-8 sm:w-12 sm:h-12" />
            </div>
          ) : (
            <>
              {/* Flag Image */}
              <div className="flex-grow flex justify-center items-center bg-gradient-to-b from-white to-gray-50 rounded-xl overflow-hidden shadow-md p-2 sm:p-4 md:p-6 max-h-[200px] sm:max-h-[300px] md:max-h-[400px]">
                <img
                  src={getImageSource(gameState.currentImage)}
                  alt="Country Flag"
                  className="w-auto h-[150px] sm:h-[250px] md:h-[300px] object-contain rounded-lg transition-transform duration-300 hover:scale-105"
                />
              </div>
  
              {/* Alerts */}
              <div className="mt-2 sm:mt-4">
                {gameState.gameOver && gameState.playerName && (
                  <Alert className="mb-2 sm:mb-3 bg-blue-100 border border-blue-200 shadow-sm">
                    <AlertDescription className="text-blue-900 font-semibold text-xs sm:text-sm">
                      The Country was: <span className="font-extrabold text-blue-800">{gameState.playerName}</span>
                    </AlertDescription>
                  </Alert>
                )}
  
                {gameState.message && (
                  <Alert
                    className={`mb-2 sm:mb-3 text-xs sm:text-sm rounded-lg shadow-sm ${
                      gameState.gameOver
                        ? 'bg-green-100 border-green-200'
                        : 'bg-gray-100 border-gray-200'
                    }`}
                  >
                    <AlertDescription
                      className={`font-medium ${
                        gameState.gameOver ? 'text-green-800' : 'text-gray-800'
                      }`}
                    >
                      {gameState.message}
                    </AlertDescription>
                    {!gameState.gameOver && gameState.hintText && (
                      <AlertDescription className="mt-1 text-gray-700 italic text-xs sm:text-sm">
                        {gameState.hintText}
                      </AlertDescription>
                    )}
                  </Alert>
                )}
              </div>
  
              {/* Input Form */}
              <form onSubmit={handleGuess} className="flex-none space-y-2 sm:space-y-4 mt-2 sm:mt-4">
                <AutocompleteInput
                  value={guess}
                  onChange={setGuess}
                  options={players}
                  placeholder={isBlocked ? "Game over, Come back tomorrow!" : "Enter the Country"}
                  disabled={gameState.gameOver || isBlocked}
                  className="w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
                <div className="flex gap-2 sm:gap-4">
                  <Button
                    type="submit"
                    disabled={gameState.gameOver || isBlocked}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium py-2 sm:py-3 text-sm sm:text-base rounded-lg shadow-md transition-transform duration-200 hover:scale-105"
                  >
                    Guess
                  </Button>
                  {(gameState.gameOver || isBlocked) && (
                    <Button
                      onClick={shareResult}
                      variant="outline"
                      className="flex items-center justify-center gap-2 sm:gap-3 border-2 border-gray-300 hover:border-gray-400 bg-white text-gray-800 hover:bg-gray-100 shadow-sm rounded-lg py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base transition-all duration-200"
                    >
                      <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      Share
                    </Button>
                  )}
                </div>
              </form>
  
              {/* Guesses */}
              <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3 justify-center sm:justify-start">
                {gameState.guesses.map((g, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg transform transition-all duration-200 ${
                      g.correct
                        ? 'bg-gradient-to-br from-green-400 to-green-500 hover:from-green-500 hover:to-green-600'
                        : 'bg-gradient-to-br from-red-400 to-red-500 hover:from-red-500 hover:to-red-600'
                    } shadow-md hover:scale-110`}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <RulesDialog open={showRules} onClose={() => setShowRules(false)} />
    </div>
  );      
};

export default GuessGame;