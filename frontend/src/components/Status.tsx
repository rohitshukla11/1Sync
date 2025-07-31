import React from "react";

export default function Status({ swap }: { swap: any }) {
  if (!swap) return null;
  return (
    <div>
      <h3>Swap Status</h3>
      <p>Hashlock: {swap.hashlock}</p>
      <p>Preimage: {swap.preimage}</p>
      {/* Add more status info as needed */}
    </div>
  );
} 