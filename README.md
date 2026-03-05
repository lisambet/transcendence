# 🏓 ft_transcendence

> A full-stack multiplayer Pong web application — the final project of the 42 School Common Core.  
> Built as a microservices SPA with real-time gameplay, OAuth2 auth, 2FA, an AI opponent, and blockchain score storage.

![CI Status](https://github.com/codastream/transcendence/actions/workflows/ci.yml/badge.svg)
![User Service Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/codastream/13a5ca1442b77566f5c439d203084db2/raw/coverage-users.json)

---

## 📖 About

ft_transcendence is a browser-based multiplayer Pong platform built entirely with a microservices architecture orchestrated by Docker Compose.  
It covers a wide range of concepts including real-time communication, modern authentication flows, containerized deployment, and blockchain integration.

---

## 🏗 Architecture

```
srcs/
├── auth/           # Authentication service — OAuth2 (42 API), JWT, 2FA
├── users/          # User management service — profiles, stats, friends
├── game/           # Game logic & WebSocket server — real-time Pong engine
├── pong-ai/        # AI opponent service
├── gateway/        # API gateway — routes requests between services
├── blockchain/     # Smart contract — stores match scores on-chain
├── redis/          # Session cache & pub/sub
├── nginx/          # Reverse proxy & HTTPS termination
├── shared/         # Shared types/utilities across services
└── tests/          # Integration & end-to-end test suite
```

---

## ⚙️ Prerequisites

- Docker & Docker Compose
- Make
- A 42 OAuth2 application (Client ID + Secret)
- Configured `.env` files (see examples in `srcs/`)

---

## 🚀 Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/lisambet/transcendence.git
cd transcendence

# 2. Set up environment variables
cp srcs/.env.example            srcs/.env
cp srcs/.env.auth.example       srcs/.env.auth
cp srcs/.env.gateway.example    srcs/.env.gateway
cp srcs/.env.blockchain.example srcs/.env.blockchain
cp srcs/.env.um.example         srcs/.env.um
# → Fill in your 42 OAuth2 credentials in srcs/.env.auth

# 3. Build and launch all services
make

# 4. Stop all services
make down
```

The app will be available at: **https://localhost**

---

## 🎮 Features

- 🏓 Real-time 1v1 Pong (local multiplayer & online)
- 🤖 AI opponent powered by a dedicated service
- 🔐 OAuth2 login via 42 intranet
- 📱 Two-Factor Authentication (2FA / TOTP)
- 👤 User profiles, avatars, match history, leaderboard
- ⛓ Blockchain-backed score storage (tamper-proof results)
- 🧪 Automated test suite (auth, game, scoring, AI)
- 🔄 CI pipeline with code coverage reporting

---

## 🧪 Running Tests

```bash
# Auth service tests
bash test-auth.sh

# Cross-service auth tests
bash test-auth-cross.sh

# Game API tests
bash test-game.sh
```

---

## 👥 Team & Contributions

| Login                                   | Contributions                                 |
| --------------------------------------- | --------------------------------------------- |
| [lisambet](https://github.com/lisambet) | _(e.g. auth service, 2FA, frontend routing)_  |
| _(teammate)_                            | _(e.g. game engine, WebSocket, AI)_           |
| _(teammate)_                            | _(e.g. blockchain, users service, DevOps/CI)_ |

---

## ⚠️ Challenges & Learnings

- _(e.g. Keeping game state synchronized between clients in real time via WebSockets required careful design of the game loop)_
- _(e.g. Integrating blockchain for score persistence meant learning Solidity and Hardhat from scratch)_
- _(e.g. Managing secrets and inter-service communication securely across Docker containers was non-trivial)_

---

## 🛠 Tech Stack

| Layer            | Technology                                    |
| ---------------- | --------------------------------------------- |
| Frontend         | TypeScript SPA (Vanilla / framework)          |
| Auth             | OAuth2 (42 API), JWT, 2FA (TOTP)              |
| Backend services | Node.js / TypeScript                          |
| Database         | PostgreSQL (users), Redis (sessions)          |
| Blockchain       | Solidity, Hardhat, Ethereum                   |
| DevOps           | Docker, Docker Compose, Nginx, GitHub Actions |
| Code quality     | ESLint, Prettier, Husky, Commitlint           |

---

## 🔒 Environment Variables

All sensitive configuration lives in `.env` files excluded from version control.  
Use the provided `.env.*.example` files as templates.

| File                   | Purpose                               |
| ---------------------- | ------------------------------------- |
| `srcs/.env`            | Global config (ports, DB credentials) |
| `srcs/.env.auth`       | 42 OAuth2 Client ID & Secret          |
| `srcs/.env.gateway`    | Gateway routing config                |
| `srcs/.env.blockchain` | RPC URL, contract address             |
| `srcs/.env.um`         | User management service config        |
