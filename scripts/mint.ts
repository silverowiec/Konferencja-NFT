import { ethers } from "hardhat";
import {KonferencjaNFT, KonferencjaNFT__factory} from "../typechain-types";

async function main() {
    // Change these variables as necessary
    const CONTRACT_ADDRESS = "0xYourDeployedContractAddress"; // Replace with your contract's address
    const recipient = "0xRecipientAddress"; // Replace with the address to receive the NFT(s)

    // Get the contract instance
    const provider = ethers.getDefaultProvider();
    const nft: KonferencjaNFT = KonferencjaNFT__factory.connect(CONTRACT_ADDRESS, provider)

    // Mint a single NFT
    console.log("Minting a single NFT...");
    const mintTx = await nft.safeMint(recipient, "uri1");
    await mintTx.wait();
    console.log("Minted token 1 to:", recipient);

    // Batch mint (if the contract supports batch minting)
    console.log("Batch minting NFTs...");
    const batchMintTx = await nft.safeBatchMint([recipient], ["uri1"]);
    await batchMintTx.wait();
    console.log("Batch minted tokens:", ["uri1"], "to:", recipient);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});