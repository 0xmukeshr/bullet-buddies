import { ethers } from "hardhat";
import hre from "hardhat";
import fs from 'fs';

async function main() {
  console.log("Deploying OneVsOneBlackRoom to", hre.network.name);

  // Deploy the contract
  const OneVsOneBlackRoom = await ethers.getContractFactory("OneVsOneBlackRoom");
  const gameContract = await OneVsOneBlackRoom.deploy();
  
  await gameContract.waitForDeployment();
  
  console.log("OneVsOneBlackRoom deployed to:", await gameContract.getAddress());

  // Save deployment info
  const contractAddress = await gameContract.getAddress();
  const deploymentData = {
    network: hre.network.name,
    contractAddress: contractAddress,
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
    await gameContract.deploymentTransaction()?.wait(6);
    
    console.log("Verifying contract on Snowtrace...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
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