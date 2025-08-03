const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HTLC", function () {
  let htlc;
  let token;
  let owner;
  let participant;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, participant, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock ERC20 token for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    token = await MockToken.deploy("Mock Token", "MTK");
    await token.waitForDeployment();

    // Deploy HTLC contract
    const HTLC = await ethers.getContractFactory("HTLC");
    htlc = await HTLC.deploy();
    await htlc.waitForDeployment();

    // Mint tokens to owner
    await token.mint(owner.address, ethers.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await htlc.getAddress()).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Swap Operations", function () {
    it("Should initiate a swap", async function () {
      const amount = ethers.parseEther("100");
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("secret"));
      const timelock = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await token.approve(await htlc.getAddress(), amount);

      await expect(
        htlc.initiateSwap(
          participant.address,
          await token.getAddress(),
          amount,
          hashlock,
          timelock,
          "stellar_destination",
          "100",
          "XLM"
        )
      ).to.emit(htlc, "SwapInitiated");
    });

    it("Should withdraw with correct preimage", async function () {
      const amount = ethers.parseEther("100");
      const preimage = ethers.toUtf8Bytes("secret");
      const hashlock = ethers.keccak256(preimage);
      const timelock = Math.floor(Date.now() / 1000) + 3600;

      await token.approve(await htlc.getAddress(), amount);

      const tx = await htlc.initiateSwap(
        participant.address,
        await token.getAddress(),
        amount,
        hashlock,
        timelock,
        "stellar_destination",
        "100",
        "XLM"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.eventName === "SwapInitiated");
      const swapId = event.args.swapId;

      await expect(
        htlc.connect(participant).withdraw(swapId, preimage)
      ).to.emit(htlc, "SwapWithdrawn");
    });

    it("Should refund after timelock expires", async function () {
      const amount = ethers.parseEther("100");
      const hashlock = ethers.keccak256(ethers.toUtf8Bytes("secret"));
      const timelock = Math.floor(Date.now() / 1000) + 1; // 1 second from now

      await token.approve(await htlc.getAddress(), amount);

      const tx = await htlc.initiateSwap(
        participant.address,
        await token.getAddress(),
        amount,
        hashlock,
        timelock,
        "stellar_destination",
        "100",
        "XLM"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.eventName === "SwapInitiated");
      const swapId = event.args.swapId;

      // Wait for timelock to expire
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine");

      await expect(
        htlc.refund(swapId)
      ).to.emit(htlc, "SwapRefunded");
    });
  });
});

// Mock ERC20 token for testing
const MockERC20 = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
`; 