import { NavBar } from '../components/molecules/NavBar';
import Background from '../components/atoms/Background';
import Arena from '../components/organisms/Arena';
import GameStatusBar from '../components/organisms/GameStatusBar';
import GameControl from '../components/organisms/GameControl';
import { useGameState } from '../hooks/GameState';
import { useGameWebSocket } from '../hooks/GameWebSocket';
import { useEffect, useState, useRef } from 'react';
import { useKeyboardControls } from '../hooks/input.tsx';
import { useGameSessions, UseGameSessionsReturn } from '../hooks/GameSessions';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import api from '../api/api-client';
export interface Paddle {
  y: number;
  height: number;
  width: number;
  speed: number;
  moving: 'up' | 'down' | 'stop';
}

export interface Paddles {
  left: Paddle;
  right: Paddle;
}

export interface Scores {
  left: number;
  right: number;
}

export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';

export interface GameState {
  ball: {
    x: number;
    y: number;
    radius: number;
  };
  paddles: {
    left: {
      y: number;
      height: number;
    };
    right: {
      y: number;
      height: number;
    };
  };
  scores: Scores;
  status: GameStatus;
  cosmicBackground: number[][] | null;
}

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

interface ServerMessage {
  type: 'connected' | 'state' | 'gameOver' | 'error' | 'pong';
  sessionId?: string;
  data?: GameState;
  message?: string;
}

interface GamePageProps {
  sessionId: string | null;
  gameMode: 'local' | 'remote' | 'tournament';
}

export const GamePage = ({ sessionId, gameMode }: GamePageProps) => {
  const { openWebSocket, closeWebSocket } = useGameWebSocket();
  const { gameStateRef, updateGameState } = useGameState();
  const [currentSessionId, setSessionId] = useState<string | null>(sessionId);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { tournamentId } = useParams<{ tournamentId?: string }>();
  const navigate = useNavigate();

  useKeyboardControls({
    wsRef,
    gameMode,
    enabled: !!currentSessionId,
  });

  const createLocalSession = async () => {
    setIsLoading(true);
    const requestBody = {
      gameMode: gameMode,
      ...(tournamentId ? { tournamentId } : {}),
    };
    interface CreateSessionResponse {
      status: 'success' | 'failure';
      message: string;
      sessionId?: string;
      wsUrl?: string;
    }
    const res = await api.post<CreateSessionResponse>('/game/create-session', requestBody);
    const data = res.data;
    if (data.sessionId) {
      setSessionId(data.sessionId);
    }
    setIsLoading(false);
  };

  const onStartGame = () => {
    if (!wsRef.current) {
      console.error('WebSocket not connected');
      return;
    }
    wsRef.current.send(JSON.stringify({ type: 'start' }));
  };

  const onExitGame = async () => {
    if (!currentSessionId) return;
    const res = await fetch(`/api/game/del/${currentSessionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok && data.message) {
      navigate('/home');
    }
  };

  useEffect(() => {
    if (gameMode === 'local' && !currentSessionId) {
      createLocalSession();
    }
  }, [gameMode, currentSessionId]);

  useEffect(() => {
    if (!currentSessionId) return;
    const connectWebSocket = async () => {
      try {
        const ws = await openWebSocket(currentSessionId, (message: ServerMessage) => {
          if (message.type === 'state' && message.data) {
            updateGameState(message.data);
          }
        });
        wsRef.current = ws;
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };
    connectWebSocket();
    return () => {
      closeWebSocket();
      wsRef.current = null;
    };
  }, [currentSessionId, openWebSocket, updateGameState, closeWebSocket]);

  const handleSelectSession = (selectedSessionId: string) => {
    setSessionId(selectedSessionId);
  };
  const sessions = useGameSessions() as UseGameSessionsReturn;

  return (
    <div className="w-full h-full relative">
      <Background
        grainIntensity={4}
        baseFrequency={0.28}
        colorStart={colors.start}
        colorEnd={colors.end}
      >
        <NavBar />
        <div className="flex flex-row flex-1 overflow-hidden">
          {/* Sidebar: scores on top, controls centered at bottom */}
          <div className="flex flex-col flex-[1] items-center justify-between p-4 gap-4">
            {gameMode === 'remote' ? (
              <GameStatusBar sessionsData={sessions} onSelectSession={handleSelectSession} />
            ) : (
              <GameStatusBar sessionsData={null} />
            )}
            <GameControl
              onCreateLocalGame={createLocalSession}
              onStartGame={onStartGame}
              onExitGame={onExitGame}
              gameMode={gameMode}
              loading={isLoading}
              className="flex-col w-full"
            />
          </div>
          <div className="flex-[3] flex justify-center p-4">
            <Arena gameStateRef={gameStateRef} />
          </div>
        </div>
      </Background>
    </div>
  );
};
