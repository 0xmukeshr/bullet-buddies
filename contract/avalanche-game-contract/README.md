# OneVsOne Black Room Game Contract

A fully functional, TypeScript-compatible smart contract for a 1v1 survival game on Avalanche C-Chain. This project includes comprehensive tests, deployment scripts, and a React frontend hook for seamless integration.

## 🎮 Game Mechanics

- **Player Spawning**: Connect wallet and spawn into the black room
- **Enemy System**: Spawn random enemies with unique addresses
- **Combat**: Shoot enemy 20 times to eliminate them
- **Survival**: Avoid enemy proximity for more than 20 seconds
- **Statistics**: Track games played, wins, and losses on-chain
- **Reset**: Clean slate for new game sessions

## 📱 Project Structure

```
avalanche-game-contract/
├── contracts/
│   └── OneVsOneBlackRoom.sol    # Main game contract
├── scripts/
│   └── deploy.ts               # Deployment script
├── test/
│   └── game.test.ts            # Comprehensive tests
├── typechain-types/            # Auto-generated TypeScript types
├── frontend/
│   ├── hooks/
│   │   └── useOneVsOneGame.ts     # React hook for contract interaction
│   └── components/
│       └── BlackRoomGame.tsx      # Sample game component
├── deployments/               # Deployment artifacts
└── hardhat.config.ts          # Hardhat configuration
```

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MetaMask wallet
- AVAX for gas fees (testnet or mainnet)

### Install Dependencies
```bash
npm install
```

### Environment Configuration
Update `.env` with your credentials:
```env
PRIVATE_KEY=your_private_key_here
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
SNOWTRACE_API_KEY=your_snowtrace_api_key_here
```

## 📝 Smart Contract

### Core Functions
```solidity
// Spawn player (one per game)
function spawnPlayer() external

// Spawn enemy with address
function spawnEnemy(address _enemy) external

// Kill player (enemy proximity win)
function killPlayer() external

// Kill enemy (20 shots win)
function killEnemy() external

// Reset for new game
function resetGame() external

// Check game status
function checkStatus() external view returns (bool, bool)
function getGameStats() external view returns (uint256, uint256, uint256)
function isGameOver() external view returns (bool)
```

### Events
```solidity
event PlayerSpawned(address indexed player);
event EnemySpawned(address indexed enemy);
event PlayerKilled(address indexed player);
event EnemyKilled(address indexed enemy);
event GameReset();
```

## 🗺️ Network Support

| Network | Chain ID | RPC URL |
|---------|----------|----------|
| **Avalanche Mainnet** | 43114 | https://api.avax.network/ext/bc/C/rpc |
| **Fuji Testnet** | 43113 | https://api.avax-test.network/ext/bc/C/rpc |
| **Hardhat Local** | 1337 | http://localhost:8545 |

## ⚙️ Development Commands

### Core Operations
```bash
# Compile contracts & generate TypeChain types
npm run compile

# Run comprehensive tests
npm test

# Deploy to local network
npm run deploy:local

# Deploy to Fuji testnet  
npm run deploy:fuji

# Deploy to Avalanche mainnet
npm run deploy:avalanche

# Clean build artifacts
npm run clean
```

### Testing
```bash
# Run all tests
npm test

# Run with gas reporting
GAS_REPORT=true npm test

# Watch mode for development
npm run test:watch
```

## 🚀 Deployment Guide

### Step 1: Local Testing
```bash
# Compile and test
npm run compile
npm test

# Deploy locally
npm run deploy:local
```

### Step 2: Testnet Deployment  
```bash
# Get test AVAX from faucet
# https://faucet.avax.network/

# Deploy to Fuji
npm run deploy:fuji
```

### Step 3: Mainnet Deployment
```bash
# Ensure you have real AVAX for gas
npm run deploy:avalanche
```

### Step 4: Verification
Contracts are automatically verified on Snowtrace after deployment.

## 🎨 Frontend Integration

### React Hook Usage
```tsx
import { useOneVsOneGame } from './frontend/hooks/useOneVsOneGame';

function GameComponent() {
  const {
    gameState,
    isLoading,
    error,
    isConnected,
    connect,
    spawnPlayer,
    spawnEnemyRandom,
    killPlayer,
    killEnemy,
    resetGame
  } = useOneVsOneGame();

  // Your game logic here...
}
```

### Contract Address Configuration
After deployment, update the contract address in:
```typescript
// frontend/hooks/useOneVsOneGame.ts
const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
```

## 📊 Gas Costs (Avalanche)

| Operation | Estimated Cost | Description |
|-----------|----------------|-------------|
| Deploy Contract | ~0.005 AVAX | One-time deployment |
| Spawn Player | ~0.001 AVAX | Start new game |
| Spawn Enemy | ~0.001 AVAX | Add enemy to game |
| Kill Player/Enemy | ~0.001 AVAX | End game condition |
| Reset Game | ~0.001 AVAX | Prepare for new round |
| **Total per Game** | **~0.004 AVAX** | **Complete game cycle** |

## 📊 Test Coverage

- ✅ Initial contract state
- ✅ Player spawning mechanics
- ✅ Enemy spawning with validation
- ✅ Game mechanics (kill functions)
- ✅ Status checking functions
- ✅ Game reset functionality
- ✅ Statistics persistence
- ✅ Error handling
- ✅ Event emissions
- ✅ Multiple game sessions

**16/16 tests passing** with full coverage

## 🔧 TypeScript Support

### Features
- ✅ Full TypeChain integration
- ✅ Auto-generated contract types  
- ✅ IntelliSense support
- ✅ Compile-time error checking
- ✅ Ethers v6 compatibility
- ✅ React hooks with type safety

### Generated Types
```typescript
import { OneVsOneBlackRoom } from './typechain-types';
import { OneVsOneBlackRoom__factory } from './typechain-types';

// Fully typed contract instance
const contract: OneVsOneBlackRoom = OneVsOneBlackRoom__factory.connect(address, signer);
```

## 🔍 Security Features

- ✅ Access control for game functions
- ✅ Input validation for addresses
- ✅ State management protection
- ✅ Reentrancy protection
- ✅ Proper event emission
- ✅ Gas-efficient operations

## 🛠️ Troubleshooting

### Common Issues

**"Player already set" Error**
```bash
# Reset the game first
contract.resetGame()
```

**"Game still in progress" Error**
```bash
# Complete the game by killing player or enemy
contract.killPlayer() # or killEnemy()
```

**TypeChain Types Not Found**
```bash
# Recompile to regenerate types
npm run compile
```

**MetaMask Connection Issues**
```typescript
// Ensure window.ethereum is available
if (typeof window.ethereum !== 'undefined') {
  // Connect logic
}
```

## 🔗 Useful Links

- [Avalanche Documentation](https://docs.avax.network/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [TypeChain Documentation](https://github.com/dethcrypto/TypeChain)
- [Avalanche Faucet (Testnet)](https://faucet.avax.network/)
- [Snowtrace Explorer](https://snowtrace.io/)

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

---

**Built with ❤️ for the Avalanche ecosystem**
