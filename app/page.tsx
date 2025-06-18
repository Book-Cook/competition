/* /app/page.tsx */
'use client';

import React, { useState, useEffect } from 'react';
import styles from './styles/Scoreboard.module.css';
import './test.css';

// Define a type for the player state
type Player = {
  name: string;
  score: number;
  selectedReward: string;
};

type GameState = {
  player1: Player;
  player2: Player;
  winningScore: number;
  winner: Player | null;
  isGameOver: boolean;
};

const loadGameState = (): GameState => {
  if (typeof window === 'undefined') {
    return {
      player1: { name: 'Player 1', score: 0, selectedReward: 'Winner gets to pick dinner!' },
      player2: { name: 'Player 2', score: 0, selectedReward: 'Loser does the dishes!' },
      winningScore: 10,
      winner: null,
      isGameOver: false
    };
  }

  try {
    const saved = localStorage.getItem('competitionGameState');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('Failed to load game state from localStorage:', error);
  }

  return {
    player1: { name: 'Player 1', score: 0, selectedReward: 'Winner gets to pick dinner!' },
    player2: { name: 'Player 2', score: 0, selectedReward: 'Loser does the dishes!' },
    winningScore: 10,
    winner: null,
    isGameOver: false
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

  // Check for winner whenever scores change
  useEffect(() => {
    if (gameState.winningScore > 0 && !gameState.isGameOver) {
      if (gameState.player1.score >= gameState.winningScore) {
        setGameState(prev => ({ ...prev, winner: prev.player1, isGameOver: true }));
      } else if (gameState.player2.score >= gameState.winningScore) {
        setGameState(prev => ({ ...prev, winner: prev.player2, isGameOver: true }));
      }
    }
  }, [gameState.player1.score, gameState.player2.score, gameState.winningScore, gameState.isGameOver]);

  const incrementScore = (playerNumber: 1 | 2) => {
    if (!gameState.isGameOver) {
      setGameState(prev => ({
        ...prev,
        [`player${playerNumber}`]: {
          ...prev[`player${playerNumber}` as keyof typeof prev] as Player,
          score: (prev[`player${playerNumber}` as keyof typeof prev] as Player).score + 1
        }
      }));
    }
  };

  const resetGame = () => {
    setGameState(prev => ({
      ...prev,
      player1: { ...prev.player1, score: 0 },
      player2: { ...prev.player2, score: 0 },
      winner: null,
      isGameOver: false
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

  const getPlayerLeadStatus = (playerNumber: 1 | 2) => {
    const player = playerNumber === 1 ? gameState.player1 : gameState.player2;
    const opponent = playerNumber === 1 ? gameState.player2 : gameState.player1;
    
    if (player.score > opponent.score) {
      return 'leading';
    } else if (player.score < opponent.score) {
      return 'behind';
    } else {
      return 'tied';
    }
  };

  const updateWinningScore = (score: number) => {
    setGameState(prev => ({
      ...prev,
      winningScore: Math.max(1, score)
    }));
  };

  const getWinnerReward = () => {
    if (gameState.winner) {
      return gameState.winner.selectedReward;
    }
    return '';
  };

  if (!isLoaded) {
    return <div className="arcade-container">Loading...</div>;
  }

  return (
    <div className="arcade-container">
      <h1 className="arcade-heading">Competition Arena</h1>
      
      <div className="arcade-gameBoard">
        <div className="arcade-players">
          <div className={`arcade-player ${getPlayerLeadStatus(1) === 'leading' ? 'player-leading' : getPlayerLeadStatus(1) === 'behind' ? 'player-behind' : 'player-tied'}`}>
            <input
              className="arcade-input"
              type="text"
              value={gameState.player1.name}
              onChange={(e) => updatePlayerName(1, e.target.value)}
              placeholder="Player 1 Name"
              style={{ marginBottom: '1rem', width: '100%' }}
            />
            <div className="arcade-score">{gameState.player1.score}</div>
            <button className="arcade-button" onClick={() => incrementScore(1)}>
              Score Point
            </button>
            <div className="arcade-settingGroup" style={{ marginTop: '1rem' }}>
              <label className="arcade-settingLabel">My Reward if I Win</label>
              <input
                className="arcade-input"
                type="text"
                value={gameState.player1.selectedReward}
                onChange={(e) => updatePlayerReward(1, e.target.value)}
                placeholder="Enter your reward..."
                style={{ width: '100%', fontSize: '0.6rem' }}
              />
            </div>
          </div>
          <div className={`arcade-player ${getPlayerLeadStatus(2) === 'leading' ? 'player-leading' : getPlayerLeadStatus(2) === 'behind' ? 'player-behind' : 'player-tied'}`}>
            <input
              className="arcade-input"
              type="text"
              value={gameState.player2.name}
              onChange={(e) => updatePlayerName(2, e.target.value)}
              placeholder="Player 2 Name"
              style={{ marginBottom: '1rem', width: '100%' }}
            />
            <div className="arcade-score">{gameState.player2.score}</div>
            <button className="arcade-button" onClick={() => incrementScore(2)}>
              Score Point
            </button>
            <div className="arcade-settingGroup" style={{ marginTop: '1rem' }}>
              <label className="arcade-settingLabel">My Reward if I Win</label>
              <input
                className="arcade-input"
                type="text"
                value={gameState.player2.selectedReward}
                onChange={(e) => updatePlayerReward(2, e.target.value)}
                placeholder="Enter your reward..."
                style={{ width: '100%', fontSize: '0.6rem' }}
              />
            </div>
          </div>
        </div>
        
        <div className="arcade-settings">
          <div className="arcade-settingGroup">
            <label className="arcade-settingLabel">Winning Score</label>
            <input
              className="arcade-input"
              type="number"
              value={gameState.winningScore}
              onChange={(e) => updateWinningScore(parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div className="arcade-settingGroup">
            <button className="arcade-button" onClick={resetGame}>
              Reset Scores
            </button>
          </div>
        </div>
      </div>
      
      {gameState.isGameOver && (
        <div className="arcade-winnerModal">
          <div className="arcade-modalContent">
            <h2 className="arcade-winnerTitle">🎉 {gameState.winner?.name} Wins!</h2>
            <p className="arcade-rewardText">{getWinnerReward()}</p>
            <button className="arcade-button" onClick={resetGame}>
              New Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
