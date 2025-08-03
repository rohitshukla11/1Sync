const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load contract addresses
const contractAddresses = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../contract-addresses.json"), "utf8")
);

async function main() {
  console.log("🔍 Testing deployed HTLC contract...\n");

  const ethereumHTLCAddress = contractAddresses.ethereum.sepolia.htlc;
  console.log("📋 Contract Address:", ethereumHTLCAddress);

  try {
    // Get contract bytecode to check if it exists
    const code = await hre.ethers.provider.getCode(ethereumHTLCAddress);
    console.log("📦 Contract Code Length:", code.length);
    
    if (code === "0x") {
      console.log("❌ No contract found at this address");
      return;
    }
    console.log("✅ Contract exists at address\n");

    // Try to get contract instance with our ABI
    const HTLC = await hre.ethers.getContractFactory("HTLC");
    const htlc = HTLC.attach(ethereumHTLCAddress);

    // Test basic functions
    console.log("🧪 Testing contract functions...");

    // Test if we can call a simple view function
    try {
      console.log("   Testing swapExists...");
      const exists = await htlc.swapExists("0x0000000000000000000000000000000000000000000000000000000000000000");
      console.log("   ✅ swapExists works:", exists);
    } catch (error) {
      console.log("   ❌ swapExists failed:", error.message);
    }

    // Try to get contract details
    try {
      console.log("   Testing getContract...");
      const contract = await htlc.getContract("0x0000000000000000000000000000000000000000000000000000000000000000");
      console.log("   ✅ getContract works");
    } catch (error) {
      console.log("   ❌ getContract failed:", error.message);
    }

    // Try to get swap details
    try {
      console.log("   Testing getSwap...");
      const swap = await htlc.getSwap("0x0000000000000000000000000000000000000000000000000000000000000000");
      console.log("   ✅ getSwap works");
    } catch (error) {
      console.log("   ❌ getSwap failed:", error.message);
    }

    // Check if the contract has the old interface
    try {
      console.log("   Testing contractExists...");
      const exists = await htlc.contractExists("0x0000000000000000000000000000000000000000000000000000000000000000");
      console.log("   ✅ contractExists works:", exists);
    } catch (error) {
      console.log("   ❌ contractExists failed:", error.message);
    }

    console.log("\n📊 Summary:");
    console.log("   Contract Address:", ethereumHTLCAddress);
    console.log("   Explorer:", contractAddresses.ethereum.sepolia.explorer);
    console.log("   Status: Contract deployed and accessible");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 