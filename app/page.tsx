/* /app/page.tsx */
'use client';

import React, { useState, useEffect } from 'react';
import styles from './styles/Scoreboard.module.css';
import './test.css';

// Define a type for daily results
type DailyResult = {
  date: string;
  dayOfWeek: string;
  player1Score: number;
  player2Score: number;
  winner: 1 | 2 | 'tie';
};

// Define a type for the player state
type Player = {
  name: string;
  dailyScore: number; // Current day's score
  selectedReward: string;
};

type GameState = {
  player1: Player;
  player2: Player;
  currentDate: string;
  currentDayOfWeek: string;
  weeklyResults: DailyResult[]; // Results for the current week (Monday-Sunday)
  competitionWinner: Player | null;
  isCompetitionOver: boolean;
  weekStartDate: string; // Monday of current week
};

const getCurrentDateString = (): string => {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
};

const getDayOfWeek = (date: string): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(date).getDay()];
};

const getWeekStartDate = (date: string): string => {
  const d = new Date(date + 'T00:00:00'); // Add time to avoid timezone issues
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
};

const loadGameState = (): GameState => {
  const currentDate = getCurrentDateString();
  const currentDayOfWeek = getDayOfWeek(currentDate);
  const weekStartDate = getWeekStartDate(currentDate);
  
  if (typeof window === 'undefined') {
    return {
      player1: { name: 'Player 1', dailyScore: 0, selectedReward: 'Winner gets to pick dinner!' },
      player2: { name: 'Player 2', dailyScore: 0, selectedReward: 'Loser does the dishes!' },
      currentDate,
      currentDayOfWeek,
      weeklyResults: [],
      competitionWinner: null,
      isCompetitionOver: false,
      weekStartDate
    };
  }

  try {
    const saved = localStorage.getItem('competitionGameState');
    if (saved) {
      const parsedState = JSON.parse(saved);
      
      // Check if it's a new day
      if (parsedState.currentDate !== currentDate) {
        // Save yesterday's results if there were any points scored
        if (parsedState.player1.dailyScore > 0 || parsedState.player2.dailyScore > 0) {
          const dailyResult: DailyResult = {
            date: parsedState.currentDate,
            dayOfWeek: parsedState.currentDayOfWeek,
            player1Score: parsedState.player1.dailyScore,
            player2Score: parsedState.player2.dailyScore,
            winner: parsedState.player1.dailyScore > parsedState.player2.dailyScore ? 1 :
                    parsedState.player2.dailyScore > parsedState.player1.dailyScore ? 2 : 'tie'
          };
          
          // Add to weekly results if not already there
          const existingResult = parsedState.weeklyResults?.find((r: DailyResult) => r.date === parsedState.currentDate);
          if (!existingResult) {
            parsedState.weeklyResults = parsedState.weeklyResults || [];
            parsedState.weeklyResults.push(dailyResult);
          }
        }
        
        // Check if it's a new week
        const newWeekStartDate = getWeekStartDate(currentDate);
        if (parsedState.weekStartDate !== newWeekStartDate) {
          // New week - check if previous week has a winner
          const prevWeekResults = parsedState.weeklyResults || [];
          const player1Wins = prevWeekResults.filter((r: DailyResult) => r.winner === 1).length;
          const player2Wins = prevWeekResults.filter((r: DailyResult) => r.winner === 2).length;
          
          if (player1Wins > player2Wins) {
            parsedState.competitionWinner = parsedState.player1;
            parsedState.isCompetitionOver = true;
          } else if (player2Wins > player1Wins) {
            parsedState.competitionWinner = parsedState.player2;
            parsedState.isCompetitionOver = true;
          }
          
          // Reset for new week
          parsedState.weeklyResults = [];
          parsedState.weekStartDate = newWeekStartDate;
        }
        
        // Reset daily scores for new day
        parsedState.player1.dailyScore = 0;
        parsedState.player2.dailyScore = 0;
        parsedState.currentDate = currentDate;
        parsedState.currentDayOfWeek = currentDayOfWeek;
      }
      
      return parsedState;
    }
  } catch (error) {
    console.warn('Failed to load game state from localStorage:', error);
  }

  return {
    player1: { name: 'Player 1', dailyScore: 0, selectedReward: 'Winner gets to pick dinner!' },
    player2: { name: 'Player 2', dailyScore: 0, selectedReward: 'Loser does the dishes!' },
    currentDate,
    currentDayOfWeek,
    weeklyResults: [],
    competitionWinner: null,
    isCompetitionOver: false,
    weekStartDate
  };
};

export default function ScoreboardPage() {
  const [gameState, setGameState] = useState<GameState>(loadGameState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize state after component mounts to avoid hydration issues
  useEffect(() => {
    setGameState(loadGameState());
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever game state changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('competitionGameState', JSON.stringify(gameState));
      } catch (error) {
        console.warn('Failed to save game state to localStorage:', error);
      }
    }
  }, [gameState, isLoaded]);

  // Check for competition winner at end of week or when mathematically impossible to lose
  useEffect(() => {
    if (!gameState.isCompetitionOver && gameState.weeklyResults && gameState.weeklyResults.length > 0) {
      const player1Wins = gameState.weeklyResults.filter(r => r.winner === 1).length;
      const player2Wins = gameState.weeklyResults.filter(r => r.winner === 2).length;
      const totalDaysInWeek = 7;
      const daysRemaining = totalDaysInWeek - gameState.weeklyResults.length;
      
      // Check if someone has mathematically won (can't be beaten even if opponent wins all remaining days)
      const player1CanWin = player1Wins + daysRemaining > player2Wins;
      const player2CanWin = player2Wins + daysRemaining > player1Wins;
      
      let winner = null;
      if (!player2CanWin && player1Wins > player2Wins) {
        winner = gameState.player1;
      } else if (!player1CanWin && player2Wins > player1Wins) {
        winner = gameState.player2;
      } else if (gameState.currentDayOfWeek === 'Sunday' && (player1Wins !== player2Wins)) {
        // End of week check
        if (player1Wins > player2Wins) {
          winner = gameState.player1;
        } else {
          winner = gameState.player2;
        }
      }
      
      if (winner) {
        setGameState(prev => ({ ...prev, competitionWinner: winner, isCompetitionOver: true }));
      }
    }
  }, [gameState.weeklyResults, gameState.currentDayOfWeek, gameState.isCompetitionOver]);

  const incrementScore = (playerNumber: 1 | 2) => {
    if (!gameState.isCompetitionOver) {
      // Add score bump animation
      const scoreElement = document.querySelector(`.arcade-player:nth-child(${playerNumber}) .arcade-score`);
      scoreElement?.classList.add('score-bump');
      setTimeout(() => {
        scoreElement?.classList.remove('score-bump');
      }, 600);

      // Create particle burst from button
      createParticleBurst(playerNumber);

      setGameState(prev => ({
        ...prev,
        [`player${playerNumber}`]: {
          ...prev[`player${playerNumber}` as keyof typeof prev] as Player,
          dailyScore: (prev[`player${playerNumber}` as keyof typeof prev] as Player).dailyScore + 1
        }
      }));
    }
  };

  const createParticleBurst = (playerNumber: 1 | 2) => {
    const colors = ['#FFD700', '#dc3545', '#28a745', '#007bff'];
    const container = document.querySelector('.arcade-container');
    
    for (let i = 0; i < 15; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti-particle';
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDuration = (Math.random() * 2 + 1) + 's';
      particle.style.animationDelay = Math.random() * 0.5 + 's';
      particle.style.animation = 'confetti-fall linear forwards';
      
      container?.appendChild(particle);
      
      setTimeout(() => {
        particle.remove();
      }, 3000);
    }
  };

  const createWinnerConfetti = () => {
    const particleTypes = ['square', 'circle', 'triangle', 'star', 'diamond'];
    const colors = ['#FFD700', '#dc3545', '#28a745', '#007bff', '#FF69B4', '#FFA500', '#32CD32', '#FF1493'];
    const container = document.body;
    
    // Store confetti state for cleanup
    let confettiInterval: NodeJS.Timeout;
    
    // Create a massive confetti explosion - 150 particles!
    for (let i = 0; i < 150; i++) {
      const particle = document.createElement('div');
      const particleType = particleTypes[Math.floor(Math.random() * particleTypes.length)];
      
      particle.className = `confetti-particle confetti-${particleType}`;
      particle.setAttribute('data-confetti', 'true'); // Mark for cleanup
      
      // Random positioning across the screen width with physics variation
      const startX = Math.random() * 100;
      particle.style.left = startX + '%';
      
      // Add physics variables as CSS custom properties
      particle.style.setProperty('--wind-force', (Math.random() - 0.5) * 200 + 'px');
      particle.style.setProperty('--gravity-speed', Math.random() * 2 + 3 + 's');
      particle.style.setProperty('--rotation-speed', Math.random() * 720 + 360 + 'deg');
      particle.style.setProperty('--bounce-height', Math.random() * 50 + 25 + 'vh');
      
      // Random colors for squares and diamonds (others have fixed colors)
      if (particleType === 'square' || particleType === 'diamond') {
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      }
      
      // Physics-based animation duration
      const duration = Math.random() * 2 + 4; // 4-6 seconds
      particle.style.animationDuration = duration + 's';
      particle.style.animationDelay = Math.random() * 1.5 + 's'; // 0-1.5 second delay
      
      container.appendChild(particle);
    }
    
    // Create continuous realistic confetti for 8 seconds
    confettiInterval = setInterval(() => {
      for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        const particleType = particleTypes[Math.floor(Math.random() * particleTypes.length)];
        
        particle.className = `confetti-particle confetti-${particleType}`;
        particle.setAttribute('data-confetti', 'true'); // Mark for cleanup
        particle.style.left = Math.random() * 100 + '%';
        
        // Add physics
        particle.style.setProperty('--wind-force', (Math.random() - 0.5) * 150 + 'px');
        particle.style.setProperty('--gravity-speed', Math.random() * 1.5 + 2.5 + 's');
        particle.style.setProperty('--rotation-speed', Math.random() * 540 + 180 + 'deg');
        
        if (particleType === 'square' || particleType === 'diamond') {
          particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        }
        
        const duration = Math.random() * 1.5 + 3;
        particle.style.animationDuration = duration + 's';
        
        container.appendChild(particle);
      }
    }, 300);
    
    // Store cleanup function globally for reset
    (window as any).cleanupConfetti = () => {
      // Clear interval
      if (confettiInterval) {
        clearInterval(confettiInterval);
      }
      
      // Remove all confetti particles immediately
      document.querySelectorAll('[data-confetti="true"]').forEach(particle => {
        particle.remove();
      });
    };
    
    // Auto cleanup after 8 seconds
    setTimeout(() => {
      if (confettiInterval) {
        clearInterval(confettiInterval);
      }
    }, 8000);
  };

  // Trigger confetti only when competition ends (not on every render)
  useEffect(() => {
    if (gameState.isCompetitionOver && gameState.competitionWinner) {
      // Small delay to let the modal appear first
      setTimeout(() => {
        createWinnerConfetti();
      }, 500);
    }
  }, [gameState.isCompetitionOver]);

  const resetDailyScores = () => {
    setGameState(prev => ({
      ...prev,
      player1: { ...prev.player1, dailyScore: 0 },
      player2: { ...prev.player2, dailyScore: 0 }
    }));
  };

  const resetCompetition = () => {
    // Clean up any existing confetti
    if ((window as any).cleanupConfetti) {
      (window as any).cleanupConfetti();
    }
    
    setGameState(prev => ({
      ...prev,
      player1: { ...prev.player1, dailyScore: 0 },
      player2: { ...prev.player2, dailyScore: 0 },
      competitionWinner: null,
      isCompetitionOver: false,
      weeklyResults: []
    }));
  };

  const updatePlayerName = (playerNumber: 1 | 2, name: string) => {
    setGameState(prev => ({
      ...prev,
      [`player${playerNumber}`]: {
        ...prev[`player${playerNumber}` as keyof typeof prev] as Player,
        name
      }
    }));
  };

  const updatePlayerReward = (playerNumber: 1 | 2, reward: string) => {
    setGameState(prev => ({
      ...prev,
      [`player${playerNumber}`]: {
        ...prev[`player${playerNumber}` as keyof typeof prev] as Player,
        selectedReward: reward
      }
    }));
  };

  const getCompetitionStage = (playerNumber: 1 | 2) => {
    if (!gameState.weeklyResults || gameState.weeklyResults.length === 0) {
      return 'start'; // Beginning of competition
    }
    
    const player1Wins = gameState.weeklyResults.filter(r => r.winner === 1).length;
    const player2Wins = gameState.weeklyResults.filter(r => r.winner === 2).length;
    const playerWins = playerNumber === 1 ? player1Wins : player2Wins;
    const opponentWins = playerNumber === 1 ? player2Wins : player1Wins;
    
    // Calculate how close to winning (need 4 wins out of 7 days)
    const winsNeeded = 4;
    const daysPlayed = player1Wins + player2Wins;
    const daysRemaining = 7 - daysPlayed;
    
    // Can they still mathematically win?
    const canWin = playerWins + daysRemaining >= winsNeeded;
    const canOpponentWin = opponentWins + daysRemaining >= winsNeeded;
    
    if (playerWins >= winsNeeded) {
      return 'winner'; // They won!
    } else if (!canWin) {
      return 'eliminated'; // They can't win
    } else if (playerWins === 3) {
      return 'critical'; // One win away from victory
    } else if (playerWins === 2) {
      return 'heated'; // Getting close
    } else if (playerWins === 1) {
      return 'building'; // Building momentum
    } else {
      return 'start'; // Just starting
    }
  };

  const getPlayerLeadStatus = (playerNumber: 1 | 2) => {
    // Base animations on weekly wins, not daily scores
    if (!gameState.weeklyResults || gameState.weeklyResults.length === 0) {
      return 'tied';
    }
    
    const player1Wins = gameState.weeklyResults.filter(r => r.winner === 1).length;
    const player2Wins = gameState.weeklyResults.filter(r => r.winner === 2).length;
    
    if (playerNumber === 1) {
      if (player1Wins > player2Wins) return 'leading';
      if (player1Wins < player2Wins) return 'behind';
    } else {
      if (player2Wins > player1Wins) return 'leading';
      if (player2Wins < player1Wins) return 'behind';
    }
    
    return 'tied';
  };

  const getWeeklyProgressPercentage = (playerNumber: 1 | 2) => {
    if (!gameState.weeklyResults || gameState.weeklyResults.length === 0) {
      return 50; // 50% when tied/no games
    }
    
    const player1Wins = gameState.weeklyResults.filter(r => r.winner === 1).length;
    const player2Wins = gameState.weeklyResults.filter(r => r.winner === 2).length;
    const totalGames = player1Wins + player2Wins;
    
    if (totalGames === 0) return 50;
    
    const playerWins = playerNumber === 1 ? player1Wins : player2Wins;
    return Math.max(20, Math.min(100, (playerWins / Math.max(totalGames, 4)) * 100)); // Scale to 4 wins needed
  };

  const getWinnerReward = () => {
    if (gameState.competitionWinner) {
      return gameState.competitionWinner.selectedReward;
    }
    return '';
  };

  const getTodayWinner = () => {
    const player1Score = gameState.player1.dailyScore;
    const player2Score = gameState.player2.dailyScore;
    
    if (player1Score > player2Score) {
      return gameState.player1.name;
    } else if (player2Score > player1Score) {
      return gameState.player2.name;
    } else if (player1Score > 0 || player2Score > 0) {
      return 'Tied';
    }
    return null;
  };

  const getWeeklyWins = () => {
    if (!gameState.weeklyResults) {
      return { player1Wins: 0, player2Wins: 0 };
    }
    const player1Wins = gameState.weeklyResults.filter(r => r.winner === 1).length;
    const player2Wins = gameState.weeklyResults.filter(r => r.winner === 2).length;
    return { player1Wins, player2Wins };
  };

  const toggleDayWinner = (dayIndex: number) => {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const targetDayName = dayNames[dayIndex];
    
    // Calculate the date for this day of the current week
    console.log('weekStartDate:', gameState.weekStartDate);
    
    // Ensure we have a valid date string
    const weekStartString = gameState.weekStartDate || getCurrentDateString();
    const weekStart = new Date(weekStartString + 'T00:00:00');
    
    // Check if the date is valid
    if (isNaN(weekStart.getTime())) {
      console.error('Invalid week start date:', weekStartString);
      return;
    }
    
    const targetDate = new Date(weekStart);
    targetDate.setDate(weekStart.getDate() + dayIndex);
    const targetDateString = targetDate.toISOString().split('T')[0];
    
    console.log('Calculated target date:', targetDateString, 'for day:', targetDayName);
    
    setGameState(prev => {
      const newWeeklyResults = [...(prev.weeklyResults || [])];
      const existingResultIndex = newWeeklyResults.findIndex(r => r.date === targetDateString);
      
      if (existingResultIndex >= 0) {
        // Toggle existing result: 1 -> 2 -> tie -> 1
        const currentWinner = newWeeklyResults[existingResultIndex].winner;
        let newWinner: 1 | 2 | 'tie';
        if (currentWinner === 1) newWinner = 2;
        else if (currentWinner === 2) newWinner = 'tie';
        else newWinner = 1;
        
        newWeeklyResults[existingResultIndex] = {
          ...newWeeklyResults[existingResultIndex],
          winner: newWinner
        };
      } else {
        // Create new result starting with player 1 winning
        newWeeklyResults.push({
          date: targetDateString,
          dayOfWeek: targetDayName,
          player1Score: 1,
          player2Score: 0,
          winner: 1
        });
      }
      
      return {
        ...prev,
        weeklyResults: newWeeklyResults
      };
    });
  };

  if (!isLoaded) {
    return <div className="arcade-container">Loading...</div>;
  }

  return (
    <div className="arcade-container">
      <h1 className="arcade-heading">Weekly Competition</h1>
      
      {/* Weekly Calendar - Arcade Style with Mobile Scaling */}
      <div className="weekly-calendar">
        <div className="calendar-grid">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
            // Calculate the actual date for this day of the week
            const weekStartString = gameState.weekStartDate || getCurrentDateString();
            const weekStart = new Date(weekStartString + 'T00:00:00');
            
            // Check if the date is valid
            if (isNaN(weekStart.getTime())) {
              console.error('Invalid week start date in calendar:', weekStartString);
              return null;
            }
            
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + index);
            const dayDateString = dayDate.toISOString().split('T')[0];
            
            const dayResult = gameState.weeklyResults?.find(r => r.date === dayDateString);
            
            const isToday = gameState.currentDayOfWeek === (index === 6 ? 'Sunday' : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index]);
            const currentDayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(gameState.currentDayOfWeek);
            const isDayPassed = index < currentDayIndex;
            
            let backgroundColor = '#3D2817';
            let textColor = '#F4E4C1';
            let opacity = 1;
            
            // Gray out past days
            if (isDayPassed) {
              opacity = 0.6;
              backgroundColor = '#2a1f10';
            }
            
            // Color based on winner
            if (dayResult) {
              if (dayResult.winner === 1) {
                backgroundColor = '#2a4d2a';
                textColor = '#FFD700';
              } else if (dayResult.winner === 2) {
                backgroundColor = '#4d2a2a';
                textColor = '#FFD700';
              } else {
                backgroundColor = '#4d4d2a';
                textColor = '#F4E4C1';
              }
            }
            
            return (
              <div 
                key={day} 
                onClick={() => toggleDayWinner(index)}
                className={`calendar-day ${isToday ? 'today' : ''}`}
                style={{
                  backgroundColor,
                  color: textColor,
                  opacity
                }}
              >
                <div>{day}</div>
                {dayResult && (
                  <div className="day-winner">
                    {dayResult.winner === 1 ? gameState.player1.name.charAt(0) : 
                     dayResult.winner === 2 ? gameState.player2.name.charAt(0) : 'T'}
                  </div>
                )}
                {isToday && !dayResult && (
                  <div className="day-winner" style={{ opacity: 0.7 }}>
                    Today
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="arcade-gameBoard">
        <div className="arcade-players">            <div className={`arcade-player ${getPlayerLeadStatus(1) === 'leading' ? 'player-leading' : getPlayerLeadStatus(1) === 'behind' ? 'player-behind' : 'player-tied'} stage-${getCompetitionStage(1)}`} 
                 style={{'--progress': `${getWeeklyProgressPercentage(1)}%`} as React.CSSProperties}>
              <input
                className="arcade-input"
                type="text"
                value={gameState.player1.name}
                onChange={(e) => updatePlayerName(1, e.target.value)}
                placeholder="Player 1 Name"
              />
              <div className="arcade-score">{gameState.player1.dailyScore}</div>
              <div style={{ fontSize: '0.7rem', marginBottom: '1rem', opacity: 0.8 }}>
                Today's Points
              </div>
              <button 
                className="arcade-button" 
                onClick={() => incrementScore(1)} 
                disabled={gameState.isCompetitionOver}
              >
                + Point
              </button>
              
              <div className="arcade-settingGroup" style={{ marginTop: '1rem' }}>
                <label className="arcade-settingLabel">Reward</label>
                <input
                  className="arcade-input"
                  type="text"
                  value={gameState.player1.selectedReward}
                  onChange={(e) => updatePlayerReward(1, e.target.value)}
                  placeholder="Enter your reward..."
                  style={{ fontSize: '0.7rem' }}
                />
              </div>
            </div>
             <div className={`arcade-player ${getPlayerLeadStatus(2) === 'leading' ? 'player-leading' : getPlayerLeadStatus(2) === 'behind' ? 'player-behind' : 'player-tied'} stage-${getCompetitionStage(2)}`}
                 style={{'--progress': `${getWeeklyProgressPercentage(2)}%`} as React.CSSProperties}>
              <input
                className="arcade-input"
                type="text"
                value={gameState.player2.name}
                onChange={(e) => updatePlayerName(2, e.target.value)}
                placeholder="Player 2 Name"
              />
              <div className="arcade-score">{gameState.player2.dailyScore}</div>
              <div style={{ fontSize: '0.7rem', marginBottom: '1rem', opacity: 0.8 }}>
                Today's Points
              </div>
              <button 
                className="arcade-button" 
                onClick={() => incrementScore(2)} 
                disabled={gameState.isCompetitionOver}
              >
                + Point
              </button>
              
              <div className="arcade-settingGroup" style={{ marginTop: '1rem' }}>
                <label className="arcade-settingLabel">Reward</label>
                <input
                  className="arcade-input"
                  type="text"
                  value={gameState.player2.selectedReward}
                  onChange={(e) => updatePlayerReward(2, e.target.value)}
                  placeholder="Enter your reward..."
                  style={{ fontSize: '0.7rem' }}
                />
              </div>
            </div>
        </div>
        
        <div className="arcade-settings">
          <div className="arcade-settingGroup">
            <button className="arcade-button" onClick={resetDailyScores}>
              Reset Today
            </button>
          </div>
          <div className="arcade-settingGroup">
            <button className="arcade-button" onClick={resetCompetition}>
              Reset Week
            </button>
          </div>
        </div>
      </div>

      {/* Epic Winner Modal */}
      {gameState.isCompetitionOver && (
        <div className="arcade-winnerModal">
          <div className="arcade-modalContent">
            <h2 className="arcade-winnerTitle">🎉 {gameState.competitionWinner?.name} Wins!</h2>
            <p className="arcade-winnerDetails">
              Weekly Wins: {gameState.competitionWinner === gameState.player1 ? getWeeklyWins().player1Wins : getWeeklyWins().player2Wins}
            </p>
            <p className="arcade-rewardText">{getWinnerReward()}</p>
            <button className="arcade-button arcade-new-week-button" onClick={resetCompetition}>
              Start New Week
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
