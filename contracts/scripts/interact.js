const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load contract addresses
const contractAddresses = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../contract-addresses.json"), "utf8")
);

async function main() {
  console.log("🔗 Interacting with deployed HTLC contracts...\n");

  // Get deployed contract addresses
  const ethereumHTLCAddress = contractAddresses.ethereum.sepolia.htlc;
  const stellarHTLCAddress = contractAddresses.stellar.testnet.htlc;

  console.log("📋 Contract Addresses:");
  console.log(`   Ethereum HTLC: ${ethereumHTLCAddress}`);
  console.log(`   Stellar HTLC: ${stellarHTLCAddress}\n`);

  // Get signers
  const [deployer, participant] = await hre.ethers.getSigners();
  console.log("👤 Signers:");
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Participant: ${participant.address}\n`);

  // Deploy mock token for testing
  console.log("🪙 Deploying mock ERC20 token...");
  const MockToken = await hre.ethers.getContractFactory("MockERC20");
  const mockToken = await MockToken.deploy("Test Token", "TEST");
  await mockToken.waitForDeployment();
  const tokenAddress = await mockToken.getAddress();
  console.log(`   Mock Token: ${tokenAddress}\n`);

  // Mint tokens to deployer
  console.log("💰 Minting tokens...");
  await mockToken.mint(deployer.address, hre.ethers.parseEther("1000"));
  console.log(`   Minted 1000 TEST tokens to ${deployer.address}\n`);

  // Get HTLC contract instance
  const HTLC = await hre.ethers.getContractFactory("HTLC");
  const htlc = HTLC.attach(ethereumHTLCAddress);

  // Test swap initiation
  console.log("🚀 Testing swap initiation...");
  const amount = hre.ethers.parseEther("100");
  const preimage = hre.ethers.toUtf8Bytes("secret123");
  const hashlock = hre.ethers.keccak256(preimage);
  const timelock = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  // Approve tokens
  await mockToken.approve(ethereumHTLCAddress, amount);
  console.log("   ✅ Approved tokens for HTLC contract");

  // Initiate swap
  const tx = await htlc.initiateSwap(
    participant.address,
    tokenAddress,
    amount,
    hashlock,
    timelock,
    "stellar_destination_address",
    "100",
    "XLM"
  );

  const receipt = await tx.wait();
  const event = receipt.logs.find(log => log.eventName === "SwapInitiated");
  const swapId = event.args.swapId;

  console.log(`   ✅ Swap initiated with ID: ${swapId}`);
  console.log(`   📊 Transaction: ${receipt.hash}\n`);

  // Get swap details
  console.log("📋 Getting swap details...");
  const swap = await htlc.getSwap(swapId);
  console.log("   Swap Details:");
  console.log(`     Initiator: ${swap.initiator}`);
  console.log(`     Participant: ${swap.participant}`);
  console.log(`     Token: ${swap.token}`);
  console.log(`     Amount: ${hre.ethers.formatEther(swap.amount)} TEST`);
  console.log(`     Hashlock: ${swap.hashlock}`);
  console.log(`     Timelock: ${new Date(swap.timelock * 1000).toISOString()}`);
  console.log(`     Withdrawn: ${swap.withdrawn}`);
  console.log(`     Refunded: ${swap.refunded}`);
  console.log(`     Stellar Destination: ${swap.stellarDestination}`);
  console.log(`     Stellar Amount: ${swap.stellarAmount}`);
  console.log(`     Stellar Asset: ${swap.stellarAsset}\n`);

  // Test withdrawal
  console.log("💸 Testing withdrawal...");
  const withdrawTx = await htlc.connect(participant).withdraw(swapId, preimage);
  await withdrawTx.wait();
  console.log(`   ✅ Withdrawal successful: ${withdrawTx.hash}\n`);

  // Verify final state
  console.log("🔍 Verifying final state...");
  const finalSwap = await htlc.getSwap(swapId);
  console.log(`   Withdrawn: ${finalSwap.withdrawn}`);
  console.log(`   Refunded: ${finalSwap.refunded}`);

  // Check participant balance
  const participantBalance = await mockToken.balanceOf(participant.address);
  console.log(`   Participant balance: ${hre.ethers.formatEther(participantBalance)} TEST\n`);

  console.log("🎉 All tests completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`   Ethereum HTLC: ${ethereumHTLCAddress}`);
  console.log(`   Stellar HTLC: ${stellarHTLCAddress}`);
  console.log(`   Mock Token: ${tokenAddress}`);
  console.log(`   Test Swap ID: ${swapId}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 