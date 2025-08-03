const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Load contract addresses
const contractAddresses = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../contract-addresses.json"), "utf8")
);

async function main() {
  console.log("🔗 Interacting with deployed Stellar HTLC contract...\n");

  const stellarHTLCAddress = contractAddresses.stellar.testnet.htlc;
  console.log("📋 Contract Addresses:");
  console.log(`   Stellar HTLC: ${stellarHTLCAddress}\n`);

  try {
    // Test get_swap function
    console.log("📋 Testing get_swap function...");
    const getSwapCommand = `stellar contract invoke --id htlc --source alice --network testnet --send=no -- get_swap --swap_id 0000000000000000000000000000000000000000000000000000000000000000`;
    
    console.log("   Command:", getSwapCommand);
    const getSwapResult = execSync(getSwapCommand, { encoding: 'utf8' });
    console.log("   Result:", getSwapResult);

    // Test htlc_exists function
    console.log("\n🔍 Testing htlc_exists function...");
    const existsCommand = `stellar contract invoke --id htlc --source alice --network testnet --send=no -- htlc_exists --swap_id 0000000000000000000000000000000000000000000000000000000000000000`;
    
    console.log("   Command:", existsCommand);
    const existsResult = execSync(existsCommand, { encoding: 'utf8' });
    console.log("   Result:", existsResult);

    // Test initiate_swap function (read-only simulation)
    console.log("\n🚀 Testing initiate_swap function (simulation)...");
    const initiateCommand = `stellar contract invoke --id htlc --source alice --network testnet --send=no -- initiate_swap --participant GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF --asset GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF --amount 100 --hashlock 0000000000000000000000000000000000000000000000000000000000000000 --timelock 1234567890 --ethereum_destination "0x742d35Cc6e94C90C45bCf4BfCb1d76C8b8C8C8C8" --ethereum_amount "100000000000000000" --ethereum_token "0xA0b86a33E6B9F6Cc0b3dc5Df7b24B8B8B8B8B8B8"`;
    
    console.log("   Command:", initiateCommand);
    const initiateResult = execSync(initiateCommand, { encoding: 'utf8' });
    console.log("   Result:", initiateResult);

    console.log("\n🎉 Stellar contract interaction tests completed!");
    console.log("\n📊 Summary:");
    console.log(`   Stellar HTLC: ${stellarHTLCAddress}`);
    console.log(`   Explorer: ${contractAddresses.stellar.testnet.explorer}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\n💡 Note: Make sure you have:");
    console.log("   1. Stellar CLI installed: cargo install stellar-cli");
    console.log("   2. Alice identity configured: stellar keys generate alice");
    console.log("   3. Alice funded: stellar keys fund alice --network testnet");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 