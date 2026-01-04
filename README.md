# Werewolf Online

An online multiplayer Werewolf (Mafia) game built with Nakama game server and React.

## Features

### Core Gameplay
- Real-time multiplayer gameplay for 6-18 players
- Complete Werewolf/Mafia rule implementation
- 10 unique roles with special abilities
- Day/Night phase cycle with voting system
- Sheriff election and badge transfer mechanics
- Lovers system (Cupid role)
- Hunter/Alpha Wolf death skills (shoot on death)
- Last words system for executed players

### Roles
| Faction | Role | Ability |
|---------|------|---------|
| Villagers | Villager | No special ability |
| Villagers | Seer | Check one player's identity each night |
| Villagers | Witch | Has one healing potion and one poison |
| Villagers | Hunter | Can shoot one player upon death |
| Villagers | Guard | Protect one player from werewolf attacks each night |
| Villagers | Idiot | Survives first vote-out (revealed, loses voting rights) |
| Werewolves | Werewolf | Kill one player each night (team decision) |
| Werewolves | Alpha Wolf | Can shoot one player upon death |
| Neutral | Cupid | Link two players as lovers on first night |

### Technical Features
- Real-time WebSocket communication
- PWA support (installable, offline capable)
- Dark/Light theme toggle
- Mobile responsive design
- Keyboard shortcuts for power users
- Sound effects system
- Message compression for reduced bandwidth
- Anti-cheat system with rate limiting
- Comprehensive logging and metrics
- Spectator mode for ongoing games
- Private rooms with password protection
- Friend invitation system
- User statistics (win rate, games played)

### UI/UX
- Animated phase transitions (day/night)
- Death effects based on cause of death
- Vote animation with flying ballots
- Emoji picker and quick phrases
- Circular seating arrangement
- Role card flip animations

## Tech Stack

### Backend (Nakama Game Server)
- **Runtime**: Nakama 3.21.1
- **Language**: TypeScript
- **Database**: CockroachDB 23.1.11
- **Protocol**: WebSocket / HTTP / gRPC

### Frontend (React Web Client)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Nakama SDK**: @heroiclabs/nakama-js

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ or Bun
- npm or bun package manager

### 1. Start Backend Services

```bash
# Build TypeScript server code
cd nakama
npm install
npm run build

# Start Nakama + CockroachDB
cd ..
docker-compose up -d
```

### 2. Start Frontend Development Server

```bash
cd client
npm install
npm run dev
```

### 3. Access the Application

- **Game**: http://localhost:5173
- **Nakama Console**: http://localhost:7351 (admin/password)
- **Nakama API**: http://localhost:7350

## Project Structure

```
workspace/
├── docker-compose.yml      # Docker services configuration
├── nakama-config.yml       # Nakama server configuration
├── nakama/                 # Backend (Nakama TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── main.ts                   # Entry point, RPC endpoints
│   │   └── werewolf/
│   │       ├── types.ts              # Type definitions
│   │       ├── match_handler.ts      # Core game logic
│   │       ├── anti-cheat.ts         # Anti-cheat system
│   │       ├── message-compress.ts   # Message compression
│   │       ├── logger.ts             # Logging system
│   │       ├── metrics.ts            # Performance metrics
│   │       └── game-events.ts        # Event logging
│   ├── __tests__/                    # Unit & integration tests
│   └── build/                        # Compiled output
├── client/                 # Frontend (React + Vite)
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx                   # Main app component
│       ├── components/
│       │   ├── GameRoom.tsx          # Game room layout
│       │   ├── PlayerSeat.tsx        # Player seat display
│       │   ├── RoleCard.tsx          # Role card with animations
│       │   ├── VotingPanel.tsx       # Voting interface
│       │   ├── ChatPanel.tsx         # Chat panel
│       │   ├── NightOverlay.tsx      # Night phase overlay
│       │   ├── DayTimer.tsx          # Speaking timer
│       │   ├── ResultModal.tsx       # Game result display
│       │   ├── SheriffPanel.tsx      # Sheriff election UI
│       │   ├── LastWordsPanel.tsx    # Last words system
│       │   ├── SpectatorView.tsx     # Spectator mode view
│       │   ├── PhaseTransition.tsx   # Day/night animations
│       │   ├── VoteAnimation.tsx     # Vote animations
│       │   ├── DeathEffect.tsx       # Death effects
│       │   ├── Lobby.tsx             # Game lobby
│       │   ├── RoomList.tsx          # Room browser
│       │   ├── InvitePanel.tsx       # Friend invitation
│       │   ├── UserStats.tsx         # Player statistics
│       │   ├── EmojiPicker.tsx       # Emoji picker
│       │   ├── QuickPhrases.tsx      # Quick chat phrases
│       │   ├── SoundSettings.tsx     # Sound controls
│       │   ├── ThemeToggle.tsx       # Theme switcher
│       │   └── KeyboardShortcutsHelp.tsx  # Shortcuts help
│       ├── hooks/
│       │   ├── useNakama.ts          # Nakama client hook
│       │   ├── useSoundEffects.ts    # Sound effects hook
│       │   ├── useTheme.tsx          # Theme management
│       │   ├── usePWA.tsx            # PWA functionality
│       │   └── useKeyboardShortcuts.ts # Keyboard shortcuts
│       ├── store/
│       │   └── gameStore.ts          # Zustand state store
│       ├── types/
│       │   └── werewolf.ts           # Frontend type definitions
│       └── utils/
│           └── message-decompress.ts # Message decompression
├── DEPLOY.md               # Deployment guide
└── PRD.md                  # Product requirements
```

## Game Rules

### Win Conditions
- **Villagers win**: All werewolves are eliminated
- **Werewolves win**: Werewolf count >= Villager count
- **Lovers win**: Both lovers survive and all others are eliminated

### Game Flow
1. **Waiting Phase**: Players join and ready up
2. **Night Phase** (First Night):
   - Cupid links two lovers (if present)
   - Werewolves discuss and choose a target
   - Seer checks one player
   - Witch uses potion (optional)
   - Guard protects one player
3. **Day Phase**:
   - Night results announced
   - Discussion phase
   - Voting phase
   - Execution (if majority reached)
   - Last words (if applicable)
4. **Death Skills**: Hunter/Alpha Wolf can shoot
5. **Sheriff Transfer**: Sheriff can pass badge before dying

### Role Configuration (Default)
| Players | Werewolves | Seer | Witch | Guard | Hunter | Villagers |
|---------|------------|------|-------|-------|--------|-----------|
| 6       | 2          | 1    | 0     | 0     | 1      | 2         |
| 8       | 2          | 1    | 1     | 0     | 1      | 3         |
| 9       | 3          | 1    | 1     | 1     | 0      | 3         |
| 12      | 4          | 1    | 1     | 1     | 1      | 4         |

## Development

### Backend Commands
```bash
cd nakama

# Build TypeScript
npm run build

# Watch mode
npm run build:watch

# Type check
npm run typecheck

# Run tests
npm test

# Watch tests
npm run test:watch
```

### Frontend Commands
```bash
cd client

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type check
npm run typecheck
```

### Running Tests
```bash
cd nakama
npm test
```

The test suite includes 155 tests covering:
- Role abilities (33 tests)
- Voting logic (33 tests)
- Game flow (38 tests)
- Anti-cheat system (51 tests)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1-9, 0` | Select player by seat number |
| `Enter/Space` | Confirm action |
| `Esc` | Cancel/Close |
| `R` | Toggle ready |
| `C` | Open chat panel |
| `V` | Open voting panel |
| `H` | Open sheriff panel |
| `S` | Toggle sound |
| `T` | Focus chat input |
| `Tab` | Switch chat channel |
| `?` | Show shortcuts help |

## API Endpoints

### RPC Endpoints
| Endpoint | Description |
|----------|-------------|
| `create_match` | Create a new game room |
| `find_match` | Quick match (public rooms) |
| `list_matches` | List available rooms |
| `get_user_stats` | Get player statistics |
| `search_users` | Search users by name |
| `send_invite` | Send game invitation |
| `get_invites` | Get invitation list |
| `respond_invite` | Accept/decline invitation |

### OpCode Messages
See `nakama/src/werewolf/types.ts` for the complete list of OpCode message types.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for detailed deployment instructions including:
- Docker Compose production setup
- Nginx reverse proxy configuration
- SSL/HTTPS setup
- Cloud platform deployment (AWS/Alibaba Cloud)
- Monitoring and logging
- Performance optimization

## Configuration

### Environment Variables

**Backend (Nakama)**
| Variable | Description | Default |
|----------|-------------|---------|
| `NAKAMA_CONSOLE_USERNAME` | Admin console username | admin |
| `NAKAMA_CONSOLE_PASSWORD` | Admin console password | password |
| `DB_HOST` | Database host | cockroachdb |

**Frontend**
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_NAKAMA_HOST` | Nakama server host | localhost |
| `VITE_NAKAMA_PORT` | Nakama server port | 7350 |
| `VITE_NAKAMA_USE_SSL` | Use HTTPS/WSS | false |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Nakama](https://heroiclabs.com/nakama/) - Open-source game server
- [React](https://react.dev/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Zustand](https://github.com/pmndrs/zustand) - State management
