import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { OneVsOneBlackRoom } from "../typechain-types";

describe("OneVsOneBlackRoom", function () {
  let contract: OneVsOneBlackRoom;
  let owner: SignerWithAddress;
  let player1: SignerWithAddress; 
  let enemy1: SignerWithAddress;
  let other: SignerWithAddress;

  beforeEach(async function () {
    [owner, player1, enemy1, other] = await ethers.getSigners();

    const OneVsOneBlackRoom = await ethers.getContractFactory("OneVsOneBlackRoom");
    contract = await OneVsOneBlackRoom.deploy();
    await contract.deployed();
  });

  describe("Initial State", function () {
    it("Should have correct initial values", async function () {
      expect(await contract.player()).to.equal(ethers.constants.AddressZero);
      expect(await contract.enemy()).to.equal(ethers.constants.AddressZero);
      expect(await contract.playerAlive()).to.be.false;
      expect(await contract.enemyAlive()).to.be.false;
      expect(await contract.gamesPlayed()).to.equal(0);
      expect(await contract.playerWins()).to.equal(0);
      expect(await contract.enemyWins()).to.equal(0);
    });
  });

  describe("Player Spawning", function () {
    it("Should allow player to spawn", async function () {
      await expect(contract.connect(player1).spawnPlayer())
        .to.emit(contract, "PlayerSpawned")
        .withArgs(player1.address);

      expect(await contract.player()).to.equal(player1.address);
      expect(await contract.playerAlive()).to.be.true;
    });

    it("Should not allow player to spawn twice", async function () {
      await contract.connect(player1).spawnPlayer();
      
      await expect(contract.connect(player1).spawnPlayer())
        .to.be.revertedWith("Player already set");
    });
  });

  describe("Enemy Spawning", function () {
    beforeEach(async function () {
      await contract.connect(player1).spawnPlayer();
    });

    it("Should allow enemy to spawn", async function () {
      await expect(contract.spawnEnemy(enemy1.address))
        .to.emit(contract, "EnemySpawned")
        .withArgs(enemy1.address);

      expect(await contract.enemy()).to.equal(enemy1.address);
      expect(await contract.enemyAlive()).to.be.true;
    });

    it("Should not allow zero address as enemy", async function () {
      await expect(contract.spawnEnemy(ethers.constants.AddressZero))
        .to.be.revertedWith("Invalid enemy address");
    });

    it("Should not allow player to be enemy", async function () {
      await expect(contract.spawnEnemy(player1.address))
        .to.be.revertedWith("Enemy cannot be the same as player");
    });
  });

  describe("Game Mechanics", function () {
    beforeEach(async function () {
      await contract.connect(player1).spawnPlayer();
      await contract.spawnEnemy(enemy1.address);
    });

    it("Should allow player to be killed", async function () {
      await expect(contract.killPlayer())
        .to.emit(contract, "PlayerKilled")
        .withArgs(player1.address);

      expect(await contract.playerAlive()).to.be.false;
      expect(await contract.enemyWins()).to.equal(1);
      expect(await contract.gamesPlayed()).to.equal(1);
    });

    it("Should allow enemy to be killed", async function () {
      await expect(contract.killEnemy())
        .to.emit(contract, "EnemyKilled")
        .withArgs(enemy1.address);

      expect(await contract.enemyAlive()).to.be.false;
      expect(await contract.playerWins()).to.equal(1);
      expect(await contract.gamesPlayed()).to.equal(1);
    });

    it("Should not allow killing already dead player", async function () {
      await contract.killPlayer();
      
      await expect(contract.killPlayer())
        .to.be.revertedWith("Player already dead");
    });

    it("Should not allow killing already dead enemy", async function () {
      await contract.killEnemy();
      
      await expect(contract.killEnemy())
        .to.be.revertedWith("Enemy already dead");
    });
  });

  describe("Status and Stats", function () {
    beforeEach(async function () {
      await contract.connect(player1).spawnPlayer();
      await contract.spawnEnemy(enemy1.address);
    });

    it("Should return correct status", async function () {
      const [playerStatus, enemyStatus] = await contract.checkStatus();
      expect(playerStatus).to.be.true;
      expect(enemyStatus).to.be.true;
    });

    it("Should return correct game stats", async function () {
      await contract.killPlayer(); // Enemy wins
      await contract.resetGame();
      
      await contract.connect(player1).spawnPlayer();
      await contract.spawnEnemy(enemy1.address);
      await contract.killEnemy(); // Player wins

      const [total, pWins, eWins] = await contract.getGameStats();
      expect(total).to.equal(2);
      expect(pWins).to.equal(1);
      expect(eWins).to.equal(1);
    });

    it("Should correctly identify game over", async function () {
      expect(await contract.isGameOver()).to.be.false;
      
      await contract.killPlayer();
      expect(await contract.isGameOver()).to.be.true;
    });
  });

  describe("Game Reset", function () {
    beforeEach(async function () {
      await contract.connect(player1).spawnPlayer();
      await contract.spawnEnemy(enemy1.address);
    });

    it("Should not allow reset during active game", async function () {
      await expect(contract.resetGame())
        .to.be.revertedWith("Game still in progress");
    });

    it("Should allow reset after game over", async function () {
      await contract.killPlayer();
      
      await expect(contract.resetGame())
        .to.emit(contract, "GameReset");

      expect(await contract.player()).to.equal(ethers.constants.AddressZero);
      expect(await contract.enemy()).to.equal(ethers.constants.AddressZero);
      expect(await contract.playerAlive()).to.be.false;
      expect(await contract.enemyAlive()).to.be.false;
    });

    it("Should preserve game statistics after reset", async function () {
      await contract.killEnemy();
      const [total1, pWins1, eWins1] = await contract.getGameStats();
      
      await contract.resetGame();
      const [total2, pWins2, eWins2] = await contract.getGameStats();
      
      expect(total2).to.equal(total1);
      expect(pWins2).to.equal(pWins1);
      expect(eWins2).to.equal(eWins1);
    });
  });
});