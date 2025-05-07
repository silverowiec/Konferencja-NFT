// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC1155} from "./base/ERC1155Modified.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {NotAllowed, PAUSER_ROLE, MINTER_ROLE, DEFAULT_ADMIN_ROLE, ArraysDifferentLengthError} from "./lib/Model.sol";

/**
 * @title KoPOAP
 * @dev ERC1155 contract for issuing Proof of Attendance tokens for conference lectures
 */
contract KoPOAP is ERC1155, AccessControl, Pausable {
    // Mapping from lecture ID to metadata about the lecture
    mapping(uint256 => LectureInfo) private _lectures;
    
    // Number of registered lectures
    uint256 private _lectureCount;
    
    // Mapping to track which addresses have claimed which lecture POAPs
    mapping(uint256 => mapping(address => bool)) private _claimed;
    
    // Mapping from lecture hash to lecture ID for QR code verification
    mapping(bytes32 => uint256) private _lectureHashToId;
    
    struct LectureInfo {
        string name;
        uint256 timestamp;
        bool active;
        string tokenURI;
        bytes32 lectureHash;
    }
    /**
    let's build a next.js app deployable to vercel later on where we have simple admin panel for lecture creation and qr code generation, qr code redirects lecture attendees to webpage where poap is minted for them (costs covered by private key stored in app, on admins behalf hes a payer) */
    
    event LectureCreated(uint256 indexed lectureId, string name, uint256 timestamp, string tokenURI, bytes32 lectureHash);
    event POAPClaimed(uint256 indexed lectureId, address indexed attendee);

    constructor(
        string memory uri_, 
        address defaultAdmin, 
        address pauser, 
        address minter
    ) ERC1155(uri_) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(MINTER_ROLE, minter);
    }
    
    /**
     * @dev Creates a new lecture POAP
     * @param name Name of the lecture
     * @param timestamp Time when the lecture occurs
     * @param uri URI for the token metadata
     */
    function createLecture(string memory name, uint256 timestamp, string memory uri)
        public 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
        returns (uint256) 
    {
        uint256 lectureId = _lectureCount + 1;
        
        // Generate a unique hash for this lecture using name, timestamp, and URI
        bytes32 lectureHash = keccak256(abi.encodePacked(name, timestamp, uri));
        
        // Ensure this hash is unique
        require(_lectureHashToId[lectureHash] == 0, "Lecture with identical parameters already exists");
        
        _lectures[lectureId] = LectureInfo({
            name: name,
            timestamp: timestamp,
            active: true,
            tokenURI: uri,
            lectureHash: lectureHash
        });
        
        // Store the hash to ID mapping for QR code resolution
        _lectureHashToId[lectureHash] = lectureId;
        
        _lectureCount = lectureId;
        
        emit LectureCreated(lectureId, name, timestamp, uri, lectureHash);
        
        return lectureId;
    }
    
    /**
     * @dev Resolves a lecture ID from a hash
     * @param hash The lecture hash
     * @return The lecture ID
     */
    function lectureHashToId(bytes32 hash) external view returns (uint256) {
        uint256 lectureId = _lectureHashToId[hash];
        require(lectureId > 0, "Lecture hash not found");
        return lectureId;
    }
    
    /**
     * @dev Admin mints POAP to attendee
     * @param lectureId ID of the lecture
     * @param attendee Address of the attendee
     */
    function mintPOAP(uint256 lectureId, address attendee) 
        public 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
    {
        require(lectureId <= _lectureCount && lectureId > 0, "Invalid lecture ID");
        require(_lectures[lectureId].active, "Lecture is not active");
        require(!_claimed[lectureId][attendee], "POAP already claimed");
        
        _claimed[lectureId][attendee] = true;
        
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        
        ids[0] = lectureId;
        amounts[0] = 1;
        
        _update(address(0), attendee, ids, amounts);
        
        emit POAPClaimed(lectureId, attendee);
    }
    
    /**
     * @dev Batch mint POAPs to multiple attendees
     * @param lectureId ID of the lecture
     * @param attendees Addresses of attendees
     */
    function batchMintPOAP(uint256 lectureId, address[] memory attendees) 
        external
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
    {
        require(lectureId <= _lectureCount && lectureId > 0, "Invalid lecture ID");
        require(_lectures[lectureId].active, "Lecture is not active");
        
        for (uint256 i = 0; i < attendees.length; i++) {
            if (!_claimed[lectureId][attendees[i]]) {
                mintPOAP(lectureId, attendees[i]);
            }
        }
    }
    
    /**
     * @dev Set the active status of a lecture
     * @param lectureId ID of the lecture
     * @param active New active status
     */
    function setLectureActive(uint256 lectureId, bool active) 
        external 
        onlyRole(MINTER_ROLE) 
    {
        require(lectureId <= _lectureCount && lectureId > 0, "Invalid lecture ID");
        _lectures[lectureId].active = active;
    }
    
    /**
     * @dev Check if an attendee has claimed a POAP for a lecture
     * @param lectureId ID of the lecture
     * @param attendee Address of the attendee
     */
    function hasClaimed(uint256 lectureId, address attendee) 
        external 
        view 
        returns (bool) 
    {
        return _claimed[lectureId][attendee];
    }
    
    /**
     * @dev Get lecture information
     * @param lectureId ID of the lecture
     */
    function getLecture(uint256 lectureId) 
        external 
        view 
        returns (string memory name, uint256 timestamp, bool active, string memory tokenURI)
    {
        require(lectureId <= _lectureCount && lectureId > 0, "Invalid lecture ID");
        LectureInfo memory info = _lectures[lectureId];
        return (info.name, info.timestamp, info.active, info.tokenURI);
    }
    
    /**
     * @dev Get full lecture information including hash
     * @param lectureId ID of the lecture
     */
    function getLectureWithHash(uint256 lectureId)
        external
        view
        returns (string memory name, uint256 timestamp, bool active, string memory tokenURI, bytes32 lectureHash)
    {
        require(lectureId <= _lectureCount && lectureId > 0, "Invalid lecture ID");
        LectureInfo memory info = _lectures[lectureId];
        return (info.name, info.timestamp, info.active, info.tokenURI, info.lectureHash);
    }

    /**
     * @dev Override for ERC1155 uri method to support token-specific URIs
     * @param id Token ID to get URI for
     */
    function uri(uint256 id) public view virtual override returns (string memory) {
        require(id <= _lectureCount && id > 0, "Invalid token ID");
        string memory tokenURI = _lectures[id].tokenURI;

        // If the token has a specific URI, return it
        if (bytes(tokenURI).length > 0) {
            return tokenURI;
        }

        // Otherwise fall back to the base URI
        return super.uri(id);
    }
    
    /**
     * @dev Get total number of lectures
     */
    function getLectureCount() external view returns (uint256) {
        return _lectureCount;
    }
    
    /**
     * @dev Pause contract
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Override for ERC1155 method to check paused state
     */
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) 
        internal 
        override 
        whenNotPaused 
    {
        super._update(from, to, ids, values);
    }
    
    /**
     * @dev Required override for AccessControl/ERC1155
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}