// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract HTLC {
    struct Swap {
        address sender;
        address receiver;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bool claimed;
        bool refunded;
        bytes32 preimage;
    }

    mapping(bytes32 => Swap) public swaps;

    event NewSwap(bytes32 indexed swapId, address indexed sender, address indexed receiver, uint256 amount, bytes32 hashlock, uint256 timelock);
    event Claimed(bytes32 indexed swapId, bytes32 preimage);
    event Refunded(bytes32 indexed swapId);

    IERC20 public token;

    constructor(address _token) {
        token = IERC20(_token);
    }

    function newSwap(address receiver, uint256 amount, bytes32 hashlock, uint256 timelock) external returns (bytes32 swapId) {
        require(timelock > block.timestamp, "Timelock in past");
        swapId = keccak256(abi.encodePacked(msg.sender, receiver, amount, hashlock, timelock));
        require(swaps[swapId].sender == address(0), "Swap exists");
        token.transferFrom(msg.sender, address(this), amount);
        swaps[swapId] = Swap(msg.sender, receiver, amount, hashlock, timelock, false, false, 0x0);
        emit NewSwap(swapId, msg.sender, receiver, amount, hashlock, timelock);
    }

    function claim(bytes32 swapId, bytes32 preimage) external {
        Swap storage s = swaps[swapId];
        require(!s.claimed && !s.refunded, "Already completed");
        require(s.receiver == msg.sender, "Not receiver");
        require(sha256(abi.encodePacked(preimage)) == s.hashlock, "Invalid preimage");
        s.claimed = true;
        s.preimage = preimage;
        token.transfer(s.receiver, s.amount);
        emit Claimed(swapId, preimage);
    }

    function refund(bytes32 swapId) external {
        Swap storage s = swaps[swapId];
        require(!s.claimed && !s.refunded, "Already completed");
        require(s.sender == msg.sender, "Not sender");
        require(block.timestamp > s.timelock, "Timelock not expired");
        s.refunded = true;
        token.transfer(s.sender, s.amount);
        emit Refunded(swapId);
    }
} 