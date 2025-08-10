# Deployment Status & Guide

## 🎯 Quick Start

### For Development (Local Testing)
```bash
# 1. Install dependencies
npm install

# 2. Compile and test
npm run compile
npm test

# 3. Deploy locally
npm run deploy:local
```

### For Fuji Testnet
```bash
# 1. Get test AVAX from faucet
# Visit: https://faucet.avax.network/

# 2. Ensure your .env has valid private key
# PRIVATE_KEY=your_private_key_here

# 3. Deploy to Fuji
npm run deploy:fuji
```

### For Avalanche Mainnet
```bash
# 1. Ensure you have real AVAX for gas fees
# 2. Double-check your private key in .env
# 3. Deploy to mainnet
npm run deploy:avalanche
```

## 📊 Current Deployments

### Local Development
- **Network**: Hardhat Local
- **Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Status**: ✅ Ready for testing

### Fuji Testnet
- **Network**: Avalanche Fuji Testnet
- **Address**: ⏳ Deploy with `npm run deploy:fuji`
- **Faucet**: https://faucet.avax.network/

### Avalanche Mainnet
- **Network**: Avalanche C-Chain
- **Address**: ⏳ Deploy with `npm run deploy:avalanche`
- **Gas Required**: ~0.005 AVAX for deployment

## 🔧 Configuration Updates Needed

After deployment, update these files:

1. **Frontend Hook**: `frontend/hooks/useOneVsOneGame.ts`
   ```typescript
   const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
   ```

2. **Your Game Frontend**: Import and use the hook
   ```typescript
   import { useOneVsOneGame } from './path/to/hooks/useOneVsOneGame';
   ```

## 🎮 Testing Your Deployed Contract

### Using Hardhat Console
```bash
# Connect to your deployed contract
npx hardhat console --network fuji  # or avalanche

# In console:
const contract = await ethers.getContractAt("OneVsOneBlackRoom", "CONTRACT_ADDRESS");
const [owner] = await ethers.getSigners();

// Test basic functions
await contract.spawnPlayer();
const stats = await contract.getGameStats();
console.log("Games played:", stats[0].toString());
```

### Using Frontend
1. Update contract address in hook
2. Connect MetaMask to same network
3. Use the React component to test gameplay

## 📋 Pre-flight Checklist

### Before Mainnet Deployment
- [ ] All tests passing (16/16)
- [ ] Contract tested on Fuji testnet
- [ ] Frontend integration working
- [ ] Sufficient AVAX for gas fees (~0.005 AVAX)
- [ ] Private key secured and correct
- [ ] Network configuration verified

### After Deployment
- [ ] Contract verified on Snowtrace
- [ ] Frontend updated with new address
- [ ] Basic functionality tested
- [ ] Gas costs documented
- [ ] Deployment artifacts saved

## 🚨 Emergency Procedures

If something goes wrong:

1. **Failed Deployment**: Check private key and network config
2. **Out of Gas**: Increase gas limit in hardhat.config.ts
3. **Verification Failed**: Run manual verification with contract address
4. **Frontend Issues**: Ensure contract address matches deployment

## 📞 Support Resources

- **Avalanche Docs**: https://docs.avax.network/
- **Hardhat Docs**: https://hardhat.org/docs
- **Snowtrace Explorer**: https://snowtrace.io/
- **Fuji Explorer**: https://testnet.snowtrace.io/

---

**Ready to deploy? Start with Fuji testnet first! 🚀**

