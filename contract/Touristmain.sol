// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TouristID {

    address public owner;
    uint256 public nextTouristId;

    struct Tourist {
        uint256 id;
        string name;
        bytes32 aadharHash; // Stores the SHA-256 hash of the identity document.
        string tripId;
        uint256 validFrom; // Unix timestamp.
        uint256 validTo;   // Unix timestamp.
        bool exists;
    }

    mapping(uint256 => Tourist) public tourists;

    enum Status { VALID, EXPIRED, UPCOMING, INVALID }

    event TouristRegistered(uint256 indexed touristId, string name, string tripId);
    event IDVerified(uint256 indexed touristId, Status status, address indexed verifier);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function.");
        _;
    }

    constructor() {
        owner = msg.sender;
        nextTouristId = 1;
    }

    function registerTourist(
        string memory _name,
        bytes32 _aadharHash,
        string memory _tripId,
        uint256 _validFrom,
        uint256 _validTo
    ) public onlyOwner returns (uint256) {
        require(_validTo > _validFrom, "End date must be after start date.");
        require(_validFrom >= block.timestamp, "Start date cannot be in the past.");

        uint256 currentId = nextTouristId;

        tourists[currentId] = Tourist({
            id: currentId,
            name: _name,
            aadharHash: _aadharHash,
            tripId: _tripId,
            validFrom: _validFrom,
            validTo: _validTo,
            exists: true
        });

        nextTouristId++;

        emit TouristRegistered(currentId, _name, _tripId);

        return currentId;
    }

    // A free, read-only function for quick checks.
    function getVerificationStatus(uint256 _touristId) public view returns (Status) {
        if (!tourists[_touristId].exists) {
            return Status.INVALID;
        }

        Tourist storage tourist = tourists[_touristId];
        
        if (block.timestamp < tourist.validFrom) {
            return Status.UPCOMING;
        } else if (block.timestamp > tourist.validTo) {
            return Status.EXPIRED;
        } else {
            return Status.VALID;
        }
    }

    // A state-changing function that creates an on-chain audit trail.
    function logVerificationAttempt(uint256 _touristId) public returns (Status) {
        Status status = getVerificationStatus(_touristId);
        emit IDVerified(_touristId, status, msg.sender);
        return status;
    }

    function getTouristDetails(uint256 _touristId) public view returns (
        uint256 id,
        string memory name,
        string memory tripId,
        uint256 validFrom,
        uint256 validTo,
        bool exists
    ) {
        Tourist storage tourist = tourists[_touristId];
        return (
            tourist.id,
            tourist.name,
            tourist.tripId,
            tourist.validFrom,
            tourist.validTo,
            tourist.exists
        );
    }
}