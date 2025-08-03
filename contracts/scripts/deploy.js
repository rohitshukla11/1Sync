const hre = require("hardhat");

async function main() {
  console.log("Deploying HTLC contract...");

  const HTLC = await hre.ethers.getContractFactory("HTLC");
  const htlc = await HTLC.deploy();

  await htlc.waitForDeployment();

  const address = await htlc.getAddress();
  console.log("HTLC deployed to:", address);

  // Verify on Etherscan if not on local network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await htlc.deployTransaction.wait(6);
    await verify(address, []);
  }
}

async function verify(contractAddress, args) {
  console.log("Verifying contract...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (e) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already verified!");
    } else {
      console.log(e);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 