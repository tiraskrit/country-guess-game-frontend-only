import { useState, useEffect } from 'react';
import { Share2, RefreshCw, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AutocompleteInput from '@/components/ui/AutocompleteInput';
import { API_URL } from './api.js';
import RulesDialog from '@/components/RulesDialog';

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

  const formatTimeUntilReset = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };
  
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
};
  
  const fetchGameState = async () => {
    setGameState(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetch(`${API_URL}/api/game-state`);
      const data = await response.json();
      
      setGameState(prev => ({
        ...prev,
        currentImage: data.blurred_image,
        gameId: data.game_id,
        nextReset: data.next_reset,
        currentDate: data.current_date,
        loading: false
      }));
      
      checkStoredGame();
      
    } catch (error) {
      setGameState(prev => ({
        ...prev,
        message: 'Error loading game',
        loading: false
      }));
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
      const response = await fetch(`${API_URL}/api/player-names`);
      const playerNames = await response.json();
      setPlayers(playerNames);
      setFilteredPlayers(playerNames);
    } catch (error) {
      console.error('Error fetching player names:', error);
    }
  };

  const handleGuess = async (e) => {
    e.preventDefault();
    
    if (!guess.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/api/guess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guess: guess.trim(),
          hint_level: gameState.hintLevel
        })
      });
      
      const data = await response.json();
      
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
          currentImage: data.image_url,  // Use original image
          playerName: data.player_name,
          message: 'Congratulations! You got it right!'
        }));
      } else {
        if (gameState.hintLevel >= 4) {
          setGameState(prev => ({
            ...prev,
            guesses: newGuesses,
            gameOver: true,
            currentImage: data.image_url,  // Use original image
            playerName: data.player_name,
            message: 'Game Over! Try again tomorrow!'
          }));
        } else {
          // Regular hint progression
          const newImage = data.image_url || data.hint_image;
          
          setGameState(prev => ({
            ...prev,
            guesses: newGuesses,
            hintLevel: prev.hintLevel + 1,
            currentImage: newImage,
            hintText: data.hint_text,
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
    
    const text = `Country Flag Guessing Game ${gameState.currentDate}\n${scoreDisplay}\nNext Flag in ${timeUntilReset}! \nPlay the game here: https://daily-flag.netlify.app/`;
    
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
    <div className="min-h-screen h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 p-4 sm:p-6">
      <Card className="w-full max-w-4xl h-full mx-auto shadow-lg border-0 flex flex-col overflow-hidden">
        <CardHeader className="bg-white rounded-t-lg border-b border-gray-200 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <CardTitle className="text-4xl sm:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-800">
              Guess the Country
            </CardTitle>
            <div className="flex items-center text-sm text-gray-700 bg-gray-100 rounded-full px-5 py-3 shadow-sm">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              <span>Next flag in: {timeUntilReset}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between p-6">
          {gameState.loading ? (
            <div className="flex justify-center items-center flex-grow">
              <RefreshCw className="animate-spin text-blue-600 w-12 h-12" />
            </div>
          ) : (
            <>
              {/* Flag Image */}
              <div className="flex-grow flex justify-center items-center bg-gradient-to-b from-white to-gray-50 rounded-xl overflow-hidden shadow-md p-6 max-h-[300px] md:max-h-[400px]">
                <img
                  src={getImageSource(gameState.currentImage)}
                  alt="Country Flag"
                  className="w-auto h-[300px] object-contain rounded-lg transition-transform duration-300 hover:scale-105"
                />
              </div>
  
              {/* Alerts */}
              <div className="mt-4">
                {gameState.gameOver && gameState.playerName && (
                  <Alert className="mb-3 bg-blue-100 border border-blue-200 shadow-sm">
                    <AlertDescription className="text-blue-900 font-semibold text-sm">
                      The Country was: <span className="font-extrabold text-blue-800">{gameState.playerName}</span>
                    </AlertDescription>
                  </Alert>
                )}
  
                {gameState.message && (
                  <Alert
                    className={`mb-3 text-sm rounded-lg shadow-sm ${
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
                      <AlertDescription className="mt-1 text-gray-700 italic">
                        {gameState.hintText}
                      </AlertDescription>
                    )}
                  </Alert>
                )}
              </div>
  
              {/* Input Form */}
              <form onSubmit={handleGuess} className="flex-none space-y-4 mt-4">
                <AutocompleteInput
                  value={guess}
                  onChange={setGuess}
                  options={players}
                  placeholder="Enter the Country"
                  disabled={gameState.gameOver}
                  className="w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={gameState.gameOver}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium py-3 rounded-lg shadow-md transition-transform duration-200 hover:scale-105"
                  >
                    Guess
                  </Button>
                  {gameState.gameOver && (
                    <Button
                      onClick={shareResult}
                      variant="outline"
                      className="flex items-center justify-center gap-3 border-2 border-gray-300 hover:border-gray-400 bg-white text-gray-800 hover:bg-gray-100 shadow-sm rounded-lg py-3 px-4 transition-all duration-200"
                    >
                      <Share2 className="w-5 h-5" />
                      Share
                    </Button>
                  )}
                </div>
              </form>
  
              {/* Guesses */}
              <div className="mt-6 flex flex-wrap gap-3 justify-center sm:justify-start">
                {gameState.guesses.map((g, i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-lg transform transition-all duration-200 ${
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