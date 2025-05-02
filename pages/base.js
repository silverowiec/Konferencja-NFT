const ERC721Enumerable_ABI = [
    {
        "constant": true,
        "inputs": [{ "name": "owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "", "type": "uint256" }],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            { "name": "owner", "type": "address" },
            { "name": "index", "type": "uint256" }
        ],
        "name": "tokenOfOwnerByIndex",
        "outputs": [{ "name": "", "type": "uint256" }],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{ "name": "tokenId", "type": "uint256" }],
        "name": "tokenURI",
        "outputs": [{ "name": "", "type": "string" }],
        "type": "function"
    }
];