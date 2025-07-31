import { ethers } from "ethers";
import express from "express";
import dotenv from "dotenv";
dotenv.config();

const ETH_RPC = process.env.ETH_RPC!;
const HTLC_ADDRESS = process.env.HTLC_ADDRESS!;
const htlcAbi = [
  "event NewSwap(bytes32 indexed swapId, address indexed sender, address indexed receiver, uint256 amount, bytes32 hashlock, uint256 timelock)",
  "event Claimed(bytes32 indexed swapId, bytes32 preimage)",
  "event Refunded(bytes32 indexed swapId)"
];

const provider = new ethers.providers.JsonRpcProvider(ETH_RPC);
const htlc = new ethers.Contract(HTLC_ADDRESS, htlcAbi, provider);

const app = express();
app.use(express.json());

htlc.on("NewSwap", (swapId, sender, receiver, amount, hashlock, timelock) => {
  console.log("[Ethereum] NewSwap:", { swapId, sender, receiver, amount: amount.toString(), hashlock, timelock: timelock.toString() });
  // TODO: Trigger Stellar claimable balance creation
});

htlc.on("Claimed", (swapId, preimage) => {
  console.log("[Ethereum] Claimed:", { swapId, preimage });
  // TODO: Notify Stellar side
});

htlc.on("Refunded", (swapId) => {
  console.log("[Ethereum] Refunded:", { swapId });
  // TODO: Notify Stellar side
});

app.post("/api/create-swap", (req, res) => {
  // Placeholder for swap creation logic
  res.json({ status: "ok" });
});

const PORT = process.env.RELAYER_PORT || 4000;
app.listen(PORT, () => {
  console.log(`Relayer running on port ${PORT}`);
}); 