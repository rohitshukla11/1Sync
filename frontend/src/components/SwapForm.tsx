import React, { useState } from "react";

export default function SwapForm({ onSwapCreated }: { onSwapCreated: (swap: any) => void }) {
  const [ethAddress, setEthAddress] = useState("");
  const [stellarAddress, setStellarAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState("eth-to-stellar");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/create-swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ethAddress, stellarAddress, amount, direction }),
    });
    const data = await res.json();
    onSwapCreated(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={ethAddress} onChange={e => setEthAddress(e.target.value)} placeholder="Ethereum Address" />
      <input value={stellarAddress} onChange={e => setStellarAddress(e.target.value)} placeholder="Stellar Address" />
      <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />
      <select value={direction} onChange={e => setDirection(e.target.value)}>
        <option value="eth-to-stellar">Ethereum → Stellar</option>
        <option value="stellar-to-eth">Stellar → Ethereum</option>
      </select>
      <button type="submit">Start Swap</button>
    </form>
  );
} 