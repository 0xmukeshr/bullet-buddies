# Blockchain Integration Setup and Testing Guide

## 🎯 Overview
This game integrates with the Avalanche Fuji Testnet to record game statistics automatically when:
- Player spawns at game start → `spawnPlayer()` contract call
- Enemy spawns at game start → `spawnEnemy()` contract call  
- Enemy is killed → `killEnemy()` contract call (player wins)
- Player dies → `killPlayer()` contract call (player loses)
- Game resets → `resetGame()` contract call

## 🛠 Setup Instructions

### 1. Install MetaMask
- Install MetaMask browser extension
- Create a wallet if you don't have one

### 2. Add Avalanche Fuji Testnet
- Network Name: `Avalanche Fuji Testnet`
- RPC URL: `https://api.avax-test.network/ext/bc/C/rpc`
- Chain ID: `43113`
- Symbol: `AVAX`
- Block Explorer: `https://testnet.snowtrace.io/`

### 3. Get Test AVAX
- Go to [Avalanche Fuji Faucet](https://faucet.avax.network/)
- Enter your wallet address
- Request test AVAX tokens

### 4. Start the Game
```bash
npm run dev
```

### 5. Connect Wallet
- Navigate to the game (localhost:3002)
- Go to the title screen
- Click on the blockchain UI in the top-right corner
- Enable blockchain toggle
- Click "Connect Wallet"
- Approve the connection in MetaMask

## 🎮 How It Works

### Automatic Blockchain Actions:
1. **Game Start**: When you start playing, the game automatically:
   - Calls `spawnPlayer()` to register your wallet address
   - Calls `spawnEnemy()` with a random generated address

2. **Enemy Kill**: When you kill an enemy (20 hits), the game automatically:
   - Calls `killEnemy()` to record your victory
   - Increments your wins counter

3. **Player Death**: When your health reaches 0, the game automatically:
   - Calls `killPlayer()` to record your loss
   - Increments the enemy wins counter

4. **Game Reset**: When you return to the title screen:
   - Calls `resetGame()` to prepare for a new round

### Debug Information
In the game, you'll see a debug panel in the top-left corner showing:
- ✅/❌ Blockchain enabled status
- ✅/❌ Wallet connection status
- Wallet address (shortened)
- Player alive status on blockchain
- Enemy alive status on blockchain  
- Total games played
- Your wins
- Your losses

## 🔧 Troubleshooting

### "No actions occur" Issues:
1. **Check blockchain is enabled**: Toggle should be ON in the blockchain UI
2. **Check wallet connection**: Should show connected with your address
3. **Check network**: Must be on Avalanche Fuji Testnet (Chain ID 43113)
4. **Check AVAX balance**: Need test AVAX for gas fees
5. **Check console logs**: Open developer tools to see transaction attempts

### Common Errors:
- `Internal JSON-RPC error` → Usually network/gas issues, try again
- `Player already set` → Game already started on contract, system will auto-reset
- `Failed to connect wallet` → Check MetaMask is installed and unlocked
- `transaction execution reverted` → Contract condition failed, usually fixed by auto-reset

### Gas Issues:
- The game uses 25 gwei gas price for Fuji testnet
- Transactions include 20% gas buffer for reliability
- If transactions fail, try manually setting higher gas in MetaMask

## 📋 Contract Details
- **Contract Address**: `0x208879493F3081949d707dE514Da5B9557d9C9a1`
- **Network**: Avalanche Fuji Testnet (Chain ID: 43113)
- **Block Explorer**: [View on Snowtrace](https://testnet.snowtrace.io/address/0x208879493F3081949d707dE514Da5B9557d9C9a1)

## 🎯 Testing Checklist

- [ ] Connect wallet successfully
- [ ] Start game and see automatic `spawnPlayer()` call
- [ ] Kill enemy and see automatic `killEnemy()` call  
- [ ] Let enemy kill you and see automatic `killPlayer()` call
- [ ] Return to title and see automatic `resetGame()` call
- [ ] Check stats increase in the debug panel
- [ ] Verify transactions on Snowtrace block explorer

## 🚀 Production Deployment

For mainnet deployment:
1. Change `CONTRACT_ADDRESS` to mainnet contract
2. Change `chainId` to `43114` for Avalanche mainnet
3. Remove debug panel from HUD
4. Test thoroughly with real AVAX

