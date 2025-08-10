import { ethers } from "hardhat";
import fs from 'fs';

async function main() {
  console.log("Deploying OneVsOneBlackRoom to", hre.network.name);

  // Deploy the contract
  const OneVsOneBlackRoom = await ethers.getContractFactory("OneVsOneBlackRoom");
  const gameContract = await OneVsOneBlackRoom.deploy();
  
  await gameContract.deployed();
  
  console.log("OneVsOneBlackRoom deployed to:", gameContract.address);

  // Save deployment info
  const deploymentData = {
    network: hre.network.name,
    contractAddress: gameContract.address,
    deployer: await (await ethers.getSigners())[0].getAddress(),
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString()
  };
  
  // Create deployments directory if it doesn't exist
  if (!fs.existsSync('deployments')) {
    fs.mkdirSync('deployments');
  }
  
  fs.writeFileSync(
    `deployments/${hre.network.name}.json`, 
    JSON.stringify(deploymentData, null, 2)
  );
  
  console.log("Deployment info saved to deployments/" + hre.network.name + ".json");

  // Wait for a few confirmations before verifying
  if (hre.network.name !== "hardhat") {
    console.log("Waiting for confirmations...");
    await gameContract.deployTransaction.wait(6);
    
    console.log("Verifying contract on Snowtrace...");
    try {
      await hre.run("verify:verify", {
        address: gameContract.address,
        constructorArguments: [],
      });
    } catch (error: any) {
      console.log("Verification failed:", error.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});