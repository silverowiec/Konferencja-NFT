import { ethers } from "hardhat";

async function main() {
    // Get the list of signers: in this case owner=admin=minter=pauser
    const [deployer] = await ethers.getSigners();

    console.log("Deploying the contract with account:", deployer.address);

    // Deploy the contract
    const NFTFactory = await ethers.getContractFactory("YourNFTContract");
    const nft = await NFTFactory.deploy(deployer.address, deployer.address, deployer.address);
    await nft.waitForDeployment();


    console.log("NFT Contract deployed to:", await nft.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});