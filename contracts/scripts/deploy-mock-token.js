const hre = require("hardhat");

async function main() {
  console.log("🪙 Deploying MockERC20 token...\n");

  // Deploy MockERC20 token
  const MockToken = await hre.ethers.getContractFactory("MockERC20");
  const mockToken = await MockToken.deploy("Test Token", "TEST");
  await mockToken.waitForDeployment();

  const tokenAddress = await mockToken.getAddress();
  console.log("✅ MockERC20 deployed successfully!");
  console.log(`📋 Token Address: ${tokenAddress}`);
  console.log(`📋 Token Name: Test Token`);
  console.log(`📋 Token Symbol: TEST`);
  console.log(`🔗 Explorer: https://sepolia.etherscan.io/address/${tokenAddress}\n`);

  // Mint some tokens to the deployer
  const deployer = (await hre.ethers.getSigners())[0];
  const mintAmount = hre.ethers.parseEther("1000000"); // 1 million tokens
  
  console.log("💰 Minting tokens to deployer...");
  await mockToken.mint(deployer.address, mintAmount);
  console.log(`✅ Minted ${hre.ethers.formatEther(mintAmount)} TEST tokens to ${deployer.address}\n`);

  // Check balance
  const balance = await mockToken.balanceOf(deployer.address);
  console.log(`📊 Deployer balance: ${hre.ethers.formatEther(balance)} TEST\n`);

  console.log("🎉 MockERC20 deployment completed!");
  console.log("\n📋 Summary:");
  console.log(`   Token Address: ${tokenAddress}`);
  console.log(`   Network: Sepolia Testnet`);
  console.log(`   Explorer: https://sepolia.etherscan.io/address/${tokenAddress}`);
  console.log(`   Initial Supply: ${hre.ethers.formatEther(mintAmount)} TEST`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 