import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { KonferencjaNFT } from "../typechain-types"; // Adjust based on your typechain paths


const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));


describe("KonferencjaNFT", () => {
    let nft: KonferencjaNFT;
    let owner: SignerWithAddress;
    let pauser: SignerWithAddress;
    let minter: SignerWithAddress;
    let accounts: SignerWithAddress[];

    // Fixture for deploying the contract
    async function deployFixture() {
        const [owner, pauser, minter, ...users] =
            await ethers.getSigners();

        const KonferencjaNFT = await ethers.getContractFactory("KonferencjaNFT");
        const nft = await KonferencjaNFT.deploy(
            owner.address,
            pauser.address,
            minter.address
        );

        return { nft, owner, pauser, minter, users };
    }

    beforeEach(async () => {
        ({ nft, owner, pauser, minter, users: accounts } = await deployFixture());
    });

    describe("Deployment", () => {
        it("Should set the right default roles and addresses", async () => {
            // Check admin
            expect(await nft.hasRole(await nft.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;

            // Check pauser
            expect(await nft.hasRole(PAUSER_ROLE, pauser.address)).to.be.true;

            // Check minter
            expect(await nft.hasRole(MINTER_ROLE, minter.address)).to.be.true;
        });

        it("Should have the correct name and symbol", async () => {
            expect(await nft.name()).to.equal("KonferencjaNFT");
            expect(await nft.symbol()).to.equal("SGH1");
        });
    });

    describe("Minting", () => {
        it("Should allow the minter to safely mint a new token", async () => {
            const tokenURI = "some-uri";
            const recipient = accounts[0];

            await nft.connect(minter).safeMint(recipient.address, tokenURI);

            expect(await nft.balanceOf(recipient.address)).to.equal(1);
            expect(await nft.ownerOf(0)).to.equal(recipient.address);
            expect(await nft.tokenURI(0)).to.equal(`ipfs://${tokenURI}`);
        });

        it("Should not allow non-minter to mint tokens", async () => {
            const recipient = accounts[0];
            await expect(
                nft.safeMint(recipient.address, "some-uri")
            ).to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount");
        });

        it("Should allow batch minting by minter", async () => {
            const recipients = [accounts[0], accounts[1], accounts[2]];
            const uris = ["uri1", "uri2", "uri3"];
            await nft.connect(minter).safeBatchMint(
                recipients.map((r) => r.address),
                uris
            );

            for (let i = 0; i < recipients.length; i++) {
                expect(await nft.balanceOf(recipients[i].address)).to.equal(1);
                expect(await nft.ownerOf(i)).to.equal(recipients[i].address);
                expect(await nft.tokenURI(i)).to.equal(`ipfs://${uris[i]}`);
            }
        });

        it("Should revert batch minting with mismatched arrays", async () => {
            const recipients = [accounts[0], accounts[1]];
            const uris = ["uri1"];
            await expect(
                nft.connect(minter).safeBatchMint(
                    recipients.map((r) => r.address),
                    uris
                )
            ).to.be.revertedWithCustomError(nft, "ArraysDifferentLengthError");
        });
    });

    describe("Pausing", () => {
        it("Should allow pauser to pause the contract", async () => {
            await nft.connect(pauser).pause();
            expect(await nft.paused()).to.be.true;
        });

        it("Should prevent minting when paused", async () => {
            await nft.connect(pauser).pause();
            await expect(
                nft.connect(minter).safeMint(accounts[0].address, "some-uri")
            ).to.be.revertedWithCustomError(nft, "EnforcedPause");
        });

        it("Should allow pauser to unpause the contract", async () => {
            await nft.connect(pauser).pause();
            await nft.connect(pauser).unpause();
            expect(await nft.paused()).to.be.false;
        });
    });

    describe("Transfers", () => {
        beforeEach(async () => {
            // Mint a token to test transfers
            await nft.connect(minter).safeMint(accounts[0].address, "uri1");
        });

        it("Should prevent transfers of tokens", async () => {
            const tokenId = 0;
            const recipient = accounts[1];
            await expect(
                nft.connect(accounts[0]).transferFrom(accounts[0].address, recipient.address, tokenId)
            ).to.be.revertedWithCustomError(nft, "NotAllowed");

            await expect(
                nft.connect(accounts[0]).transferFrom(accounts[0].address, recipient.address, tokenId)
            ).to.be.revertedWithCustomError(nft, "NotAllowed");
        });

    });

    describe("tokenURI and metadata", () => {
        it("Should correctly return the tokenURI", async () => {
            const tokenURI = "example-uri";
            const tokenRecipient = accounts[0];

            await nft.connect(minter).safeMint(tokenRecipient.address, tokenURI);

            expect(await nft.tokenURI(0)).to.equal(`ipfs://${tokenURI}`);
        });

        it("Should revert tokenURI for non-existent tokens", async () => {
            await expect(nft.tokenURI(99)).to.be.revertedWithCustomError(nft, "ERC721NonexistentToken");
        });
    });

    describe("ERC721 Enumerable", () => {
        it("Should enumerate all minted tokens correctly", async () => {
            const recipients = [accounts[0], accounts[1], accounts[2]];
            const uris = ["uri1", "uri2", "uri3"];
            await nft.connect(minter).safeBatchMint(
                recipients.map((r) => r.address),
                uris
            );

            expect(await nft.totalSupply()).to.equal(3);
            expect(await nft.tokenOfOwnerByIndex(recipients[0].address, 0)).to.equal(
                0
            );
            expect(await nft.tokenOfOwnerByIndex(recipients[1].address, 0)).to.equal(
                1
            );
        });
    });
});