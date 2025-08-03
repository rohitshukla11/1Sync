const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load contract addresses
const contractAddresses = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../contract-addresses.json"), "utf8")
);

async function main() {
  console.log("🔗 Interacting with deployed HTLC contract (Original Interface)...\n");

  const ethereumHTLCAddress = contractAddresses.ethereum.sepolia.htlc;
  console.log("📋 Contract Address:", ethereumHTLCAddress);

  // Get signers
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  const recipient = signers[1] || signers[0]; // Use deployer as recipient if only one signer

  console.log("👤 Signers:");
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Recipient: ${recipient.address}\n`);

  // Get HTLC contract instance with original interface
  const HTLC = await hre.ethers.getContractFactory("contracts/HTLC_Original.sol:HTLC");
  const htlc = HTLC.attach(ethereumHTLCAddress);

  // Test contract existence
  console.log("🔍 Testing contract existence...");
  const testContractId = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const exists = await htlc.contractExists(testContractId);
  console.log(`   Contract exists for ${testContractId}: ${exists}\n`);

  // Test creating a new HTLC contract
  console.log("🚀 Testing newContract function...");
  const preimage = hre.ethers.toUtf8Bytes("secret123");
  const hashlock = hre.ethers.keccak256(preimage);
  const timelock = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const amount = hre.ethers.parseEther("0.01"); // 0.01 ETH

  try {
    const tx = await htlc.newContract(
      recipient.address,
      hashlock,
      timelock,
      { value: amount }
    );

    const receipt = await tx.wait();
    const event = receipt.logs.find(log => log.eventName === "HTLCNew");
    const contractId = event.args.contractId;

    console.log(`   ✅ HTLC contract created with ID: ${contractId}`);
    console.log(`   📊 Transaction: ${receipt.hash}\n`);

    // Get contract details
    console.log("📋 Getting contract details...");
    const contract = await htlc.getContract(contractId);
    console.log("   Contract Details:");
    console.log(`     Recipient: ${contract.recipient}`);
    console.log(`     Amount: ${hre.ethers.formatEther(contract.amount)} ETH`);
    console.log(`     Hashlock: ${contract.hashlock}`);
    console.log(`     Timelock: ${new Date(Number(contract.timelock) * 1000).toISOString()}`);
    console.log(`     Withdrawn: ${contract.withdrawn}`);
    console.log(`     Refunded: ${contract.refunded}\n`);

    // Test withdrawal (if recipient is different from deployer)
    if (recipient.address !== deployer.address) {
      console.log("💸 Testing withdrawal...");
      const withdrawTx = await htlc.connect(recipient).withdraw(contractId, preimage);
      await withdrawTx.wait();
      console.log(`   ✅ Withdrawal successful: ${withdrawTx.hash}\n`);

      // Get preimage
      console.log("🔑 Getting preimage...");
      const retrievedPreimage = await htlc.getPreimage(contractId);
      console.log(`   Preimage: ${retrievedPreimage}\n`);
    } else {
      console.log("💸 Skipping withdrawal test (same signer)\n");
    }

    // Verify final state
    console.log("🔍 Verifying final state...");
    const finalContract = await htlc.getContract(contractId);
    console.log(`   Withdrawn: ${finalContract.withdrawn}`);
    console.log(`   Refunded: ${finalContract.refunded}`);

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Ethereum HTLC: ${ethereumHTLCAddress}`);
    console.log(`   Test Contract ID: ${contractId}`);
    console.log(`   Amount: ${hre.ethers.formatEther(amount)} ETH`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Tip: Make sure the deployer account has enough ETH for the transaction");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 