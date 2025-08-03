// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract HTLC is ReentrancyGuard {
    using ECDSA for bytes32;

    struct Swap {
        address initiator;
        address participant;
        address token;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bool withdrawn;
        bool refunded;
        string stellarDestination;
        string stellarAmount;
        string stellarAsset;
    }

    mapping(bytes32 => Swap) public swaps;
    mapping(address => uint256) public nonces;

    event SwapInitiated(
        bytes32 indexed swapId,
        address indexed initiator,
        address indexed participant,
        address token,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock,
        string stellarDestination,
        string stellarAmount,
        string stellarAsset
    );

    event SwapWithdrawn(bytes32 indexed swapId, bytes preimage);
    event SwapRefunded(bytes32 indexed swapId);

    modifier onlyParticipant(bytes32 swapId) {
        require(swaps[swapId].participant == msg.sender, "Not swap participant");
        _;
    }

    modifier onlyInitiator(bytes32 swapId) {
        require(swaps[swapId].initiator == msg.sender, "Not swap initiator");
        _;
    }

    function initiateSwap(
        address participant,
        address token,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock,
        string memory stellarDestination,
        string memory stellarAmount,
        string memory stellarAsset
    ) external nonReentrant returns (bytes32) {
        require(amount > 0, "Amount must be greater than 0");
        require(timelock > block.timestamp + 10 minutes, "Timelock too short");
        require(timelock < block.timestamp + 24 hours, "Timelock too long");

        uint256 nonce = nonces[msg.sender]++;
        
        bytes32 swapId = keccak256(
            abi.encodePacked(
                msg.sender,
                participant,
                token,
                amount,
                hashlock,
                timelock,
                nonce
            )
        );

        require(swaps[swapId].initiator == address(0), "Swap already exists");

        swaps[swapId] = Swap({
            initiator: msg.sender,
            participant: participant,
            token: token,
            amount: amount,
            hashlock: hashlock,
            timelock: timelock,
            withdrawn: false,
            refunded: false,
            stellarDestination: stellarDestination,
            stellarAmount: stellarAmount,
            stellarAsset: stellarAsset
        });

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        emit SwapInitiated(
            swapId,
            msg.sender,
            participant,
            token,
            amount,
            hashlock,
            timelock,
            stellarDestination,
            stellarAmount,
            stellarAsset
        );

        return swapId;
    }

    function withdraw(bytes32 swapId, bytes memory preimage) 
        external 
        onlyParticipant(swapId) 
        nonReentrant 
    {
        Swap storage swap = swaps[swapId];
        
        require(!swap.withdrawn, "Already withdrawn");
        require(!swap.refunded, "Already refunded");
        require(block.timestamp < swap.timelock, "Timelock expired");
        require(keccak256(preimage) == swap.hashlock, "Invalid preimage");

        swap.withdrawn = true;
        
        IERC20(swap.token).transfer(swap.participant, swap.amount);

        emit SwapWithdrawn(swapId, preimage);
    }

    function refund(bytes32 swapId) 
        external 
        onlyInitiator(swapId) 
        nonReentrant 
    {
        Swap storage swap = swaps[swapId];
        
        require(!swap.withdrawn, "Already withdrawn");
        require(!swap.refunded, "Already refunded");
        require(block.timestamp >= swap.timelock, "Timelock not expired");

        swap.refunded = true;
        
        IERC20(swap.token).transfer(swap.initiator, swap.amount);

        emit SwapRefunded(swapId);
    }

    function getSwap(bytes32 swapId) external view returns (Swap memory) {
        return swaps[swapId];
    }

    function swapExists(bytes32 swapId) external view returns (bool) {
        return swaps[swapId].initiator != address(0);
    }
} 