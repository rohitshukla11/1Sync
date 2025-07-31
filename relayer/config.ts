import dotenv from "dotenv";
dotenv.config();

export const ETH_RPC = process.env.ETH_RPC!;
export const HTLC_ADDRESS = process.env.HTLC_ADDRESS!;
export const ERC20_ADDRESS = process.env.ERC20_ADDRESS!;
export const STELLAR_HORIZON = process.env.STELLAR_HORIZON!;
export const RELAYER_PORT = process.env.RELAYER_PORT || 4000; 