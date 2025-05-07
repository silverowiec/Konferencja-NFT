import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { KoPOAP } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { keccak256 } from "ethers";
import { encodePacked } from "viem";

// Extract role constants
const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

describe("KoPOAP", () => {
    let poap: KoPOAP;
    let owner: SignerWithAddress;
    let pauser: SignerWithAddress;
    let minter: SignerWithAddress;
    let attendees: SignerWithAddress[];
    const baseURI = "ipfs://base-uri/";

    // Fixture for deploying the contract before each test
    async function deployPoapFixture() {
        const [owner, pauser, minter, ...attendees] = await ethers.getSigners();

        const KoPOAP = await ethers.getContractFactory("KoPOAP");
        const poap = await KoPOAP.deploy(
            baseURI,
            owner.address,
            pauser.address,
            minter.address
        );

        return { poap, owner, pauser, minter, attendees };
    }

    beforeEach(async () => {
        ({ poap, owner, pauser, minter, attendees } = await deployPoapFixture());
    });

    describe("Deployment", () => {
        it("Should set the correct roles", async () => {
            expect(await poap.hasRole(await poap.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
            expect(await poap.hasRole(PAUSER_ROLE, pauser.address)).to.be.true;
            expect(await poap.hasRole(MINTER_ROLE, minter.address)).to.be.true;
        });

        it("Should set the base URI", async () => {
            const id = 1;
            const lectureURI = "";

            // Create a lecture with empty URI to test baseURI fallback
            await poap.connect(minter).createLecture("Test Lecture", await time.latest(), lectureURI);

            // Mint POAP
            await poap.connect(minter).mintPOAP(id, attendees[0].address);

            // Check that it falls back to baseURI
            expect(await poap.uri(id)).to.equal(baseURI);
        });
    });

    describe("Lecture Creation", () => {
        it("Should allow minter to create a lecture", async () => {
            const timestamp = await time.latest();
            const lectureURI = "ipfs://lecture-uri/";

            const tx = await poap.connect(minter).createLecture("Blockchain Basics", timestamp, lectureURI);

            // Check lecture was created with ID 1
            const lectureId = 1;
            expect(await poap.getLectureCount()).to.equal(lectureId);

            // Verify event was emitted
            await expect(tx)
                .to.emit(poap, "LectureCreated")
                .withArgs(lectureId, "Blockchain Basics", timestamp, lectureURI, keccak256(encodePacked(["string", "uint256", "string"], ["Blockchain Basics", timestamp, lectureURI])));

            // Check lecture details
            const lecture = await poap.getLecture(lectureId);
            expect(lecture.name).to.equal("Blockchain Basics");
            expect(lecture.timestamp).to.equal(timestamp);
            expect(lecture.active).to.be.true;
            expect(lecture.tokenURI).to.equal(lectureURI);
        });

        it("Should revert if non-minter tries to create a lecture", async () => {
            await expect(
                poap.connect(attendees[0]).createLecture("Unauthorized", await time.latest(), "uri")
            ).to.be.revertedWithCustomError(poap, "AccessControlUnauthorizedAccount");
        });

        it("Should revert lecture creation when paused", async () => {
            await poap.connect(pauser).pause();

            await expect(
                poap.connect(minter).createLecture("While Paused", await time.latest(), "uri")
            ).to.be.revertedWithCustomError(poap, "EnforcedPause");
        });
    });

    describe("Minting POAPs", () => {
        let lectureId: number;

        beforeEach(async () => {
            // Create a lecture for tests
            await poap.connect(minter).createLecture("Test Lecture", await time.latest(), "test-uri");
            lectureId = 1;
        });

        it("Should allow minter to mint a POAP", async () => {
            const attendee = attendees[0];

            await expect(poap.connect(minter).mintPOAP(lectureId, attendee.address))
                .to.emit(poap, "POAPClaimed")
                .withArgs(lectureId, attendee.address);

            // Check token balance and claimed status
            expect(await poap.balanceOf(attendee.address, lectureId)).to.equal(1);
            expect(await poap.hasClaimed(lectureId, attendee.address)).to.be.true;
        });

        it("Should revert minting for invalid lecture ID", async () => {
            const invalidId = 999;

            await expect(
                poap.connect(minter).mintPOAP(invalidId, attendees[0].address)
            ).to.be.revertedWith("Invalid lecture ID");
        });

        it("Should revert minting if lecture is inactive", async () => {
            // Deactivate the lecture
            await poap.connect(minter).setLectureActive(lectureId, false);

            await expect(
                poap.connect(minter).mintPOAP(lectureId, attendees[0].address)
            ).to.be.revertedWith("Lecture is not active");
        });

        it("Should revert minting if already claimed", async () => {
            const attendee = attendees[0];

            // Mint once
            await poap.connect(minter).mintPOAP(lectureId, attendee.address);

            // Try to mint again
            await expect(
                poap.connect(minter).mintPOAP(lectureId, attendee.address)
            ).to.be.revertedWith("POAP already claimed");
        });

        it("Should revert if non-minter tries to mint", async () => {
            await expect(
                poap.connect(attendees[0]).mintPOAP(lectureId, attendees[1].address)
            ).to.be.revertedWithCustomError(poap, "AccessControlUnauthorizedAccount");
        });

        it("Should revert minting when paused", async () => {
            await poap.connect(pauser).pause();

            await expect(
                poap.connect(minter).mintPOAP(lectureId, attendees[0].address)
            ).to.be.revertedWithCustomError(poap, "EnforcedPause");
        });
    });

    describe("Batch Minting POAPs", () => {
        let lectureId: number;

        beforeEach(async () => {
            await poap.connect(minter).createLecture("Conference Keynote", await time.latest(), "keynote-uri");
            lectureId = 1;
        });

        it("Should mint POAPs to multiple attendees", async () => {
            const batchAttendees = attendees.slice(0, 3).map(a => a.address);

            await poap.connect(minter).batchMintPOAP(lectureId, batchAttendees);

            // Check balances and claimed status for all attendees
            for (let i = 0; i < batchAttendees.length; i++) {
                expect(await poap.balanceOf(batchAttendees[i], lectureId)).to.equal(1);
                expect(await poap.hasClaimed(lectureId, batchAttendees[i])).to.be.true;
            }
        });

        it("Should skip already claimed POAPs in batch mint", async () => {
            // Pre-mint to first attendee
            await poap.connect(minter).mintPOAP(lectureId, attendees[0].address);

            // Batch mint including the first attendee again
            const batchAttendees = attendees.slice(0, 3).map(a => a.address);
            await poap.connect(minter).batchMintPOAP(lectureId, batchAttendees);

            // Verify all have claimed
            for (let i = 0; i < batchAttendees.length; i++) {
                expect(await poap.hasClaimed(lectureId, batchAttendees[i])).to.be.true;
            }

            // First attendee should still only have 1 token
            expect(await poap.balanceOf(attendees[0].address, lectureId)).to.equal(1);
        });

        it("Should revert batch minting for invalid lecture ID", async () => {
            const invalidId = 999;

            await expect(
                poap.connect(minter).batchMintPOAP(invalidId, [attendees[0].address])
            ).to.be.revertedWith("Invalid lecture ID");
        });

        it("Should revert batch minting if lecture is inactive", async () => {
            await poap.connect(minter).setLectureActive(lectureId, false);

            await expect(
                poap.connect(minter).batchMintPOAP(lectureId, [attendees[0].address])
            ).to.be.revertedWith("Lecture is not active");
        });

        it("Should handle empty array of attendees", async () => {
            await poap.connect(minter).batchMintPOAP(lectureId, []);
            // Should complete without errors
        });

        it("Should revert if non-minter tries to batch mint", async () => {
            await expect(
                poap.connect(attendees[0]).batchMintPOAP(lectureId, [attendees[1].address])
            ).to.be.revertedWithCustomError(poap, "AccessControlUnauthorizedAccount");
        });

        it("Should revert batch minting when paused", async () => {
            await poap.connect(pauser).pause();

            await expect(
                poap.connect(minter).batchMintPOAP(lectureId, [attendees[0].address])
            ).to.be.revertedWithCustomError(poap, "EnforcedPause");
        });
    });

    describe("Lecture Management", () => {
        let lectureId: number;

        beforeEach(async () => {
            await poap.connect(minter).createLecture("Workshop", await time.latest(), "workshop-uri");
            lectureId = 1;
        });

        it("Should allow minter to set lecture active status", async () => {
            // Deactivate the lecture
            await poap.connect(minter).setLectureActive(lectureId, false);

            // Verify it's inactive
            const lecture = await poap.getLecture(lectureId);
            expect(lecture.active).to.be.false;

            // Reactivate the lecture
            await poap.connect(minter).setLectureActive(lectureId, true);

            // Verify it's active again
            const updatedLecture = await poap.getLecture(lectureId);
            expect(updatedLecture.active).to.be.true;
        });

        it("Should revert setting active status for invalid lecture ID", async () => {
            const invalidId = 999;

            await expect(
                poap.connect(minter).setLectureActive(invalidId, false)
            ).to.be.revertedWith("Invalid lecture ID");
        });

        it("Should revert if non-minter tries to change lecture status", async () => {
            await expect(
                poap.connect(attendees[0]).setLectureActive(lectureId, false)
            ).to.be.revertedWithCustomError(poap, "AccessControlUnauthorizedAccount");
        });
    });

    describe("Lecture Queries", () => {
        let lectureId: number;

        beforeEach(async () => {
            const timestamp = await time.latest();
            await poap.connect(minter).createLecture("Seminar", timestamp, "seminar-uri");
            lectureId = 1;
        });

        it("Should return correct lecture information", async () => {
            const lecture = await poap.getLecture(lectureId);

            expect(lecture.name).to.equal("Seminar");
            expect(lecture.active).to.be.true;
            expect(lecture.tokenURI).to.equal("seminar-uri");
        });

        it("Should return correct lecture count", async () => {
            expect(await poap.getLectureCount()).to.equal(1);

            // Add another lecture
            await poap.connect(minter).createLecture("Another Lecture", await time.latest(), "uri2");

            expect(await poap.getLectureCount()).to.equal(2);
        });

        it("Should revert querying invalid lecture ID", async () => {
            const invalidId = 999;

            await expect(
                poap.getLecture(invalidId)
            ).to.be.revertedWith("Invalid lecture ID");
        });

        it("Should return correct claimed status", async () => {
            const attendee = attendees[0];

            // Not claimed initially
            expect(await poap.hasClaimed(lectureId, attendee.address)).to.be.false;

            // Mint a POAP
            await poap.connect(minter).mintPOAP(lectureId, attendee.address);

            // Should be claimed now
            expect(await poap.hasClaimed(lectureId, attendee.address)).to.be.true;
        });
    });

    describe("URI Handling", () => {
        let lectureId: number;

        beforeEach(async () => {
            // Create lecture with specific URI
            await poap.connect(minter).createLecture("With URI", await time.latest(), "specific-uri");
            lectureId = 1;

            // Create lecture with empty URI
            await poap.connect(minter).createLecture("No URI", await time.latest(), "");
        });

        it("Should return specific URI when set", async () => {
            expect(await poap.uri(lectureId)).to.equal("specific-uri");
        });

        it("Should fall back to base URI when token URI is empty", async () => {
            const emptyURILectureId = 2;
            expect(await poap.uri(emptyURILectureId)).to.equal(baseURI);
        });

        it("Should revert for invalid token ID", async () => {
            const invalidId = 999;

            await expect(
                poap.uri(invalidId)
            ).to.be.revertedWith("Invalid token ID");
        });
    });

    describe("Pausing", () => {
        it("Should allow pauser to pause the contract", async () => {
            await poap.connect(pauser).pause();
            expect(await poap.paused()).to.be.true;
        });

        it("Should allow pauser to unpause the contract", async () => {
            await poap.connect(pauser).pause();
            await poap.connect(pauser).unpause();
            expect(await poap.paused()).to.be.false;
        });

        it("Should revert if non-pauser tries to pause", async () => {
            await expect(
                poap.connect(attendees[0]).pause()
            ).to.be.revertedWithCustomError(poap, "AccessControlUnauthorizedAccount");
        });

        it("Should revert if non-pauser tries to unpause", async () => {
            await poap.connect(pauser).pause();

            await expect(
                poap.connect(attendees[0]).unpause()
            ).to.be.revertedWithCustomError(poap, "AccessControlUnauthorizedAccount");
        });

        it("Should prevent token transfers when paused", async () => {
            // Setup: create lecture and mint token
            const lectureId = 1;
            await poap.connect(minter).createLecture("Test", await time.latest(), "uri");
            await poap.connect(minter).mintPOAP(lectureId, attendees[0].address);

            // Pause contract
            await poap.connect(pauser).pause();

            // Attempt transfer
            await expect(
                poap.connect(attendees[0]).safeTransferFrom(
                    attendees[0].address,
                    attendees[1].address,
                    lectureId,
                    1,
                    "0x"
                )
            ).to.be.revertedWithCustomError(poap, "NotAllowed");
        });
    });

    describe("Interface Support", () => {
        it("Should support ERC1155 interface", async () => {
            const ERC1155InterfaceId = "0xd9b67a26";
            expect(await poap.supportsInterface(ERC1155InterfaceId)).to.be.true;
        });

        it("Should support AccessControl interface", async () => {
            const AccessControlInterfaceId = "0x7965db0b";
            expect(await poap.supportsInterface(AccessControlInterfaceId)).to.be.true;
        });
    });
});
