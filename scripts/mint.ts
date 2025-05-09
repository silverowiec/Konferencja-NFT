import { ethers } from "hardhat";
import { KoPOAP } from "../typechain-types";

async function main() {
    // Change these variables as necessary
    const CONTRACT_ADDRESS = "0xYourDeployedContractAddress"; // Replace with your contract's address
    const recipient = "0xRecipientAddress"; // Replace with the address to receive the POAP
    
    // Define lecture properties
    const lectureName = "Sample Lecture";
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours from now
    const tokenURI = "ipfs://your-lecture-metadata-uri";

    // Get contract instance
    const [signer] = await ethers.getSigners();
    const poapContract = await ethers.getContractAt("KoPOAP", CONTRACT_ADDRESS, signer);

    // Calculate lecture hash for the lecture
    const lectureHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["string", "uint256", "string"],
            [lectureName, deadline, tokenURI]
        )
    );

    console.log("Creating lecture...");
    try {
        // Create a lecture
        const createTx = await poapContract.createLecture(lectureName, deadline, tokenURI);
        await createTx.wait();
        console.log(`Lecture "${lectureName}" created with hash:`, lectureHash);

        // Mint a POAP to the recipient
        console.log("Minting POAP...");
        const mintTx = await poapContract.mintPOAP(lectureHash, recipient);
        const receipt = await mintTx.wait();

        // Find the token ID from the event
        const events = receipt.logs
            .map(log => {
                try {
                    return poapContract.interface.parseLog(log);
                } catch (e) {
                    return null;
                }
            })
            .filter(event => event && event.name === 'POAPClaimed');
            
        if (events.length > 0) {
            const tokenId = events[0].args[2];
            console.log(`POAP minted successfully! Token ID: ${tokenId} to address: ${recipient}`);
            
            // Batch mint to multiple recipients (if needed)
            // const recipients = [recipient, "0xAnotherAddress", "0xThirdAddress"];
            // console.log("Batch minting POAPs...");
            // const batchTx = await poapContract.batchMintPOAP(lectureHash, recipients);
            // await batchTx.wait();
            // console.log("Batch mint completed to:", recipients);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});