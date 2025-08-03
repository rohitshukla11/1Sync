// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title HTLC (Hash Time-Locked Contract)
 * @dev A contract for atomic swaps between Ethereum and other blockchains
 * @author 1Sync Cross-Chain Atomic Swap System
 */
contract HTLC {
    struct Swap {
        address payable recipient;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bool withdrawn;
        bool refunded;
        bytes32 preimage;
    }

    mapping(bytes32 => Swap) public swaps;
    
    event HTLCNew(
        bytes32 indexed contractId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock
    );
    
    event HTLCWithdraw(bytes32 indexed contractId, bytes32 preimage);
    event HTLCRefund(bytes32 indexed contractId);

    /**
     * @dev Create a new HTLC contract
     * @param _recipient The recipient of the funds
     * @param _hashlock The hash of the preimage
     * @param _timelock The timestamp when the contract expires
     * @return contractId The ID of the created contract
     */
    function newContract(
        address payable _recipient,
        bytes32 _hashlock,
        uint256 _timelock
    ) external payable returns (bytes32 contractId) {
        require(_recipient != address(0), "Invalid recipient");
        require(_timelock > block.timestamp, "Timelock must be in the future");
        require(msg.value > 0, "Amount must be greater than 0");

        contractId = keccak256(
            abi.encodePacked(
                msg.sender,
                _recipient,
                msg.value,
                _hashlock,
                _timelock
            )
        );

        // Ensure the contract doesn't already exist
        require(swaps[contractId].recipient == address(0), "Contract already exists");

        swaps[contractId] = Swap(
            _recipient,
            msg.value,
            _hashlock,
            _timelock,
            false,
            false,
            0x0
        );

        emit HTLCNew(
            contractId,
            msg.sender,
            _recipient,
            msg.value,
            _hashlock,
            _timelock
        );
    }

    /**
     * @dev Withdraw funds from the HTLC contract using the preimage
     * @param _contractId The ID of the contract
     * @param _preimage The preimage that hashes to the hashlock
     */
    function withdraw(bytes32 _contractId, bytes32 _preimage) external {
        Swap storage swap = swaps[_contractId];
        
        require(swap.recipient != address(0), "Contract does not exist");
        require(!swap.withdrawn, "Already withdrawn");
        require(!swap.refunded, "Already refunded");
        require(swap.hashlock == keccak256(abi.encodePacked(_preimage)), "Incorrect preimage");
        require(block.timestamp < swap.timelock, "Timelock expired");
        require(msg.sender == swap.recipient, "Only recipient can withdraw");

        swap.withdrawn = true;
        swap.preimage = _preimage;

        emit HTLCWithdraw(_contractId, _preimage);

        swap.recipient.transfer(swap.amount);
    }

    /**
     * @dev Refund the sender if the timelock has expired
     * @param _contractId The ID of the contract
     */
    function refund(bytes32 _contractId) external {
        Swap storage swap = swaps[_contractId];
        
        require(swap.recipient != address(0), "Contract does not exist");
        require(!swap.withdrawn, "Already withdrawn");
        require(!swap.refunded, "Already refunded");
        require(block.timestamp >= swap.timelock, "Timelock not expired");

        swap.refunded = true;

        emit HTLCRefund(_contractId);

        payable(msg.sender).transfer(swap.amount);
    }

    /**
     * @dev Get contract details
     * @param _contractId The ID of the contract
     * @return recipient The recipient address
     * @return amount The amount of ETH
     * @return hashlock The hashlock
     * @return timelock The timelock timestamp
     * @return withdrawn Whether the contract has been withdrawn
     * @return refunded Whether the contract has been refunded
     */
    function getContract(bytes32 _contractId) external view returns (
        address recipient,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock,
        bool withdrawn,
        bool refunded
    ) {
        Swap storage swap = swaps[_contractId];
        return (
            swap.recipient,
            swap.amount,
            swap.hashlock,
            swap.timelock,
            swap.withdrawn,
            swap.refunded
        );
    }

    /**
     * @dev Check if a contract exists
     * @param _contractId The ID of the contract
     * @return True if the contract exists
     */
    function contractExists(bytes32 _contractId) external view returns (bool) {
        return swaps[_contractId].recipient != address(0);
    }

    /**
     * @dev Get the preimage for a withdrawn contract
     * @param _contractId The ID of the contract
     * @return The preimage if the contract has been withdrawn
     */
    function getPreimage(bytes32 _contractId) external view returns (bytes32) {
        require(swaps[_contractId].withdrawn, "Contract not withdrawn");
        return swaps[_contractId].preimage;
    }
} 