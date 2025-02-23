// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import "./base/ERC721Modified.sol";
import "./base/ERC721Enumerable.sol";
import "./base/ERC721URIStorage.sol";

import {ArraysDifferentLengthError, NotAllowed, PAUSER_ROLE, MINTER_ROLE, DEFAULT_ADMIN_ROLE} from "./lib/Model.sol";

/// @custom:security-contact dawid.walas.tsz@gmail.com
contract KonferencjaNFT is ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl, Pausable {

    uint256 private _nextTokenId;

    constructor(address defaultAdmin, address pauser, address minter)
    ERC721("KonferencjaNFT", "SGH1")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(MINTER_ROLE, minter);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://";
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function safeMint(address to, string memory uri) public onlyRole(MINTER_ROLE) whenNotPaused {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function safeBatchMint(address[] memory to, string[] memory uri) external onlyRole(MINTER_ROLE) whenNotPaused {
        if(to.length != uri.length)
            revert ArraysDifferentLengthError();
        for(uint i=0; i<to.length; i++)
            safeMint(to[i], uri[i]);
    }

    // The following functions are overrides required by Solidity.

    function _update(address to, uint256 tokenId, address auth)
    internal
    whenNotPaused
    override(ERC721, ERC721Enumerable)
    returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
    internal
    override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
    public
    view
    override(ERC721, ERC721URIStorage)
    returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}