const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load contract addresses
const contractAddresses = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../contract-addresses.json"), "utf8")
);

async function main() {
  console.log("🪙 Testing deployed MockERC20 token...\n");

  const mockTokenAddress = contractAddresses.ethereum.sepolia.mockERC20;
  console.log("📋 MockERC20 Address:", mockTokenAddress);
  console.log("🔗 Explorer: https://sepolia.etherscan.io/address/" + mockTokenAddress + "\n");

  try {
    // Get contract instance
    const MockToken = await hre.ethers.getContractFactory("MockERC20");
    const mockToken = MockToken.attach(mockTokenAddress);

    // Get signers
    const [deployer] = await hre.ethers.getSigners();
    console.log("👤 Deployer:", deployer.address);

    // Get token info
    console.log("\n📋 Token Information:");
    const name = await mockToken.name();
    const symbol = await mockToken.symbol();
    const decimals = await mockToken.decimals();
    const totalSupply = await mockToken.totalSupply();
    
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Total Supply: ${hre.ethers.formatEther(totalSupply)} ${symbol}`);

    // Get deployer balance
    const balance = await mockToken.balanceOf(deployer.address);
    console.log(`   Deployer Balance: ${hre.ethers.formatEther(balance)} ${symbol}\n`);

    // Test minting (if deployer has mint role)
    console.log("💰 Testing mint function...");
    try {
      const mintAmount = hre.ethers.parseEther("1000");
      const tx = await mockToken.mint(deployer.address, mintAmount);
      await tx.wait();
      console.log(`   ✅ Successfully minted ${hre.ethers.formatEther(mintAmount)} ${symbol}`);
      
      // Check new balance
      const newBalance = await mockToken.balanceOf(deployer.address);
      console.log(`   New Balance: ${hre.ethers.formatEther(newBalance)} ${symbol}`);
    } catch (error) {
      console.log(`   ❌ Mint failed: ${error.message}`);
    }

    console.log("\n🎉 MockERC20 token test completed!");
    console.log("\n📊 Summary:");
    console.log(`   Token Address: ${mockTokenAddress}`);
    console.log(`   Token Name: ${name}`);
    console.log(`   Token Symbol: ${symbol}`);
    console.log(`   Total Supply: ${hre.ethers.formatEther(totalSupply)} ${symbol}`);
    console.log(`   Deployer Balance: ${hre.ethers.formatEther(balance)} ${symbol}`);

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