import { FastifyInstance, FastifyRequest } from 'fastify';
import { randomUUID } from 'crypto';
import { gameSessions } from '../core/game.state.js';
import { getGame as getSessionData } from '../service/game.init.js';
import { handleClientMessage } from '../service/game.communication.js';
import { GameSettings } from '../core/game.types.js';
import { WebSocket } from 'ws';

// Controller - get sessionId from body
export async function gameSettings(this: FastifyInstance, req: FastifyRequest) {
  const body = req.body as {
    sessionId?: string;
    settings?: GameSettings;
  };

  const sessionId = body.sessionId;
  const settings = body.settings;

  if (!sessionId) {
    this.log.warn({ body }, 'Missing sessionId in request body');
    return {
      status: 'failure',
      message: 'sessionId is required in request body',
    };
  }

  if (!settings) {
    this.log.warn({ sessionId, body }, 'Missing settings in request body');
    return {
      status: 'failure',
      message: 'settings are required in request body',
    };
  }

  const sessionData = gameSessions.get(sessionId);
  if (!sessionData) {
    this.log.warn({ sessionId }, 'Session not found');
    return {
      status: 'failure',
      message: `Session ${sessionId} not found`,
    };
  }

  if (sessionData.game.status != 'waiting') {
    this.log.warn({ sessionId }, 'Session is running or finished');
    return {
      status: 'failure',
      message: `game session cannot be changed (certainly running)`,
    };
  }
  sessionData.game.applySettings(settings as GameSettings);
  this.log.info({ sessionId, settings }, 'Game settings applied successfully');

  return {
    status: 'success',
    message: 'Settings applied',
    sessionId: sessionId,
    appliedSettings: sessionData.game.getSettings(),
  };
}

export async function newGameSession(this: FastifyInstance) {
  const sessionId = randomUUID();
  const sessionData = getSessionData.call(this, null, sessionId);
  if (sessionData.game) sessionData.game.preview();
  return {
    status: 'success',
    message: 'Game session created',
    sessionId: sessionId,
    wsUrl: `/game/${sessionId}`,
  };
}

export async function healthCheck() {
  return {
    status: 'healthy',
    service: 'websocket-game-service',
    activeSessions: gameSessions.size,
    timestamp: new Date().toISOString(),
  };
}

export async function listGameSessions() {
  const sessions = Array.from(gameSessions.entries()).map(([id, sessionData]) => ({
    sessionId: id,
    state: sessionData.game.getState(),
    playerCount: sessionData.players.size,
    hasInterval: sessionData.interval !== null,
  }));

  return {
    status: 'success',
    count: sessions.length,
    sessions,
  };
}

export async function webSocketConnect(
  this: FastifyInstance,
  socket: WebSocket,
  req: FastifyRequest,
) {
  console.log('get to the sessions id by WS');
  const params = req.params as { sessionId: string };
  const sessionId = params.sessionId;
  handleClientMessage.call(this, socket, sessionId);
}

// RL API: Reset game session and start it immediately for RL training
export async function resetGame(this: FastifyInstance, req: FastifyRequest) {
  const body = req.body as { sessionId?: string };
  const sessionId = body.sessionId;
  if (!sessionId) {
    return { status: 'failure', message: 'sessionId is required' };
  }
  const sessionData = gameSessions.get(sessionId);
  if (!sessionData) {
    return { status: 'failure', message: `Session ${sessionId} not found` };
  }

  // Stop any running interval
  if (sessionData.interval) {
    clearInterval(sessionData.interval);
    sessionData.interval = null;
  }

  // Full reset
  sessionData.game.scores.left = 0;
  sessionData.game.scores.right = 0;
  sessionData.game.status = 'playing';  // set before start() so it doesn't early-return
  sessionData.game.resetBall();

  // Re-initialise the noise field
  if (sessionData.game.cosmicBackground) {
    sessionData.game.time = 0;
  }

  return { status: 'success', state: sessionData.game.getState() };
}

// RL API: Step (apply action + advance N ticks)
export async function stepGame(this: FastifyInstance, req: FastifyRequest) {
  const body = req.body as {
    sessionId?: string;
    action?: 'up' | 'down' | 'stop';
    paddle?: 'left' | 'right';
  };
  const sessionId = body.sessionId;
  const action = body.action;
  const paddle = body.paddle || 'right';
  if (!sessionId || !action) {
    return { status: 'failure', message: 'sessionId and action are required' };
  }
  const sessionData = gameSessions.get(sessionId);
  if (!sessionData) {
    return { status: 'failure', message: `Session ${sessionId} not found` };
  }

  const prevScoreRight = sessionData.game.scores.right;
  const prevScoreLeft  = sessionData.game.scores.left;
  const prevState      = sessionData.game.getState();

  sessionData.game.setPaddleDirection(paddle, action);
  sessionData.game.update();

  const state         = sessionData.game.getState();
  const done          = sessionData.game.status === 'finished';
  const scoredRight   = sessionData.game.scores.right - prevScoreRight;
  const scoredLeft    = sessionData.game.scores.left  - prevScoreLeft;

  // Shaped reward:
  //   +1   AI scores a point
  //   -1   opponent scores a point
  //   +0.1 small reward for keeping paddle close to ball (encourages tracking)
  const paddleCenterY = (state.paddles[paddle].y + state.paddles[paddle].height / 2);
  const ballY         = state.ball.y;
  const maxDist       = 600;
  const trackingReward = (1 - Math.abs(paddleCenterY - ballY) / maxDist) * 0.1;

  let reward = scoredRight - scoredLeft + (done ? 0 : trackingReward);

  return {
    status: 'success',
    state,
    reward,
    done,
  };
}

// RL API: Get current state
export async function getGameState(this: FastifyInstance, req: FastifyRequest) {
  const sessionId =
    (req.query as { sessionId?: string }).sessionId ||
    (req.body as { sessionId?: string }).sessionId;
  if (!sessionId) {
    return { status: 'failure', message: 'sessionId is required' };
  }
  const sessionData = gameSessions.get(sessionId);
  if (!sessionData) {
    return { status: 'failure', message: `Session ${sessionId} not found` };
  }
  return { status: 'success', state: sessionData.game.getState() };
}
