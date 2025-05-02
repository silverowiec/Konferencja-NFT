import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { KoPOAP } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

// Extract role constants
const DEFAULT_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DEFAULT_ADMIN_ROLE"));
const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

describe("KoPOAP", function () {
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

    beforeEach(async function () {
        ({ poap, owner, pauser, minter, attendees } = await deployPoapFixture());
    });

    describe("Deployment", function () {
        it("Should set the correct roles", async function () {
            expect(await poap.hasRole(await poap.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
            expect(await poap.hasRole(PAUSER_ROLE, pauser.address)).to.be.true;
            expect(await poap.hasRole(MINTER_ROLE, minter.address)).to.be.true;
        });

        it("Should set the base URI", async function () {
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

    describe("Lecture Creation", function () {
        it("Should allow minter to create a lecture", async function () {
            const timestamp = await time.latest();
            const lectureURI = "ipfs://lecture-uri/";

            const tx = await poap.connect(minter).createLecture("Blockchain Basics", timestamp, lectureURI);

            // Check lecture was created with ID 1
            const lectureId = 1;
            expect(await poap.getLectureCount()).to.equal(lectureId);

            // Verify event was emitted
            await expect(tx)
                .to.emit(poap, "LectureCreated")
                .withArgs(lectureId, "Blockchain Basics", timestamp, lectureURI);

            // Check lecture details
            const lecture = await poap.getLecture(lectureId);
            expect(lecture.name).to.equal("Blockchain Basics");
            expect(lecture.timestamp).to.equal(timestamp);
            expect(lecture.active).to.be.true;
            expect(lecture.tokenURI).to.equal(lectureURI);
        });

        it("Should revert if non-minter tries to create a lecture", async function () {
            await expect(
                poap.connect(attendees[0]).createLecture("Unauthorized", await time.latest(), "uri")
            ).to.be.revertedWithCustomError(poap, "AccessControlUnauthorizedAccount");
        });

        it("Should revert lecture creation when paused", async function () {
            await poap.connect(pauser).pause();

            await expect(
                poap.connect(minter).createLecture("While Paused", await time.latest(), "uri")
            ).to.be.revertedWithCustomError(poap, "EnforcedPause");
        });
    });

    describe("Minting POAPs", function () {
        let lectureId: number;

        beforeEach(async function () {
            // Create a lecture for tests
            await poap.connect(minter).createLecture("Test Lecture", await time.latest(), "test-uri");
            lectureId = 1;
        });

        it("Should allow minter to mint a POAP", async function () {
            const attendee = attendees[0];

            await expect(poap.connect(minter).mintPOAP(lectureId, attendee.address))
                .to.emit(poap, "POAPClaimed")
                .withArgs(lectureId, attendee.address);

            // Check token balance and claimed status
            expect(await poap.balanceOf(attendee.address, lectureId)).to.equal(1);
            expect(await poap.hasClaimed(lectureId, attendee.address)).to.be.true;
        });

        it("Should revert minting for invalid lecture ID", async function () {
            const invalidId = 999;

            await expect(
                poap.connect(minter).mintPOAP(invalidId, attendees[0].address)
            ).to.be.revertedWith("Invalid lecture ID");
        });

        it("Should revert minting if lecture is inactive", async function () {
            // Deactivate the lecture
            await poap.connect(minter).setLectureActive(lectureId, false);

            await expect(
                poap.connect(minter).mintPOAP(lectureId, attendees[0].address)
            ).to.be.revertedWith("Lecture is not active");
        });

        it("Should revert minting if already claimed", async function () {
            const attendee = attendees[0];

            // Mint once
            await poap.connect(minter).mintPOAP(lectureId, attendee.address);

            // Try to mint again
            await expect(
                poap.connect(minter).mintPOAP(lectureId, attendee.address)
            ).to.be.revertedWith("POAP already claimed");
        });

        it("Should revert if non-minter tries to mint", async function () {
            await expect(
                poap.connect(attendees[0]).mintPOAP(lectureId, attendees[1].address)
            ).to.be.revertedWithCustomError(poap, "AccessControlUnauthorizedAccount");
        });

        it("Should revert minting when paused", async function () {
            await poap.connect(pauser).pause();

            await expect(
                poap.connect(minter).mintPOAP(lectureId, attendees[0].address)
            ).to.be.revertedWithCustomError(poap, "EnforcedPause");
        });
    });

    describe("Batch Minting POAPs", function () {
        let lectureId: number;

        beforeEach(async function () {
            await poap.connect(minter).createLecture("Conference Keynote", await time.latest(), "keynote-uri");
            lectureId = 1;
        });

        it("Should mint POAPs to multiple attendees", async function () {
            const batchAttendees = attendees.slice(0, 3).map(a => a.address);

            await poap.connect(minter).batchMintPOAP(lectureId, batchAttendees);

            // Check balances and claimed status for all attendees
            for (let i = 0; i < batchAttendees.length; i++) {
                expect(await poap.balanceOf(batchAttendees[i], lectureId)).to.equal(1);
                expect(await poap.hasClaimed(lectureId, batchAttendees[i])).to.be.true;
            }
        });

        it("Should skip already claimed POAPs in batch mint", async function () {
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

        it("Should revert batch minting for invalid lecture ID", async function () {
            const invalidId = 999;

            await expect(
                poap.connect(minter).batchMintPOAP(invalidId, [attendees[0].address])
            ).to.be.revertedWith("Invalid lecture ID");
        });

        it("Should revert batch minting if lecture is inactive", async function () {
            await poap.connect(minter).setLectureActive(lectureId, false);

            await expect(
                poap.connect(minter).batchMintPOAP(lectureId, [attendees[0].address])
            ).to.be.revertedWith("Lecture is not active");
        });

        it("Should handle empty array of attendees", async function () {
            await poap.connect(minter).batchMintPOAP(lectureId, []);
            // Should complete without errors
        });

        it("Should revert if non-minter tries to batch mint", async function () {
            await expect(
                poap.connect(attendees[0]).batchMintPOAP(lectureId, [attendees[1].address])
            ).to.be.revertedWithCustomError(poap, "AccessControlUnauthorizedAccount");
        });

        it("Should revert batch minting when paused", async function () {
            await poap.connect(pauser).pause();

            await expect(
                poap.connect(minter).batchMintPOAP(lectureId, [attendees[0].address])
            ).to.be.revertedWithCustomError(poap, "EnforcedPause");
        });
    });

    describe("Lecture Management", function () {
        let lectureId: number;

        beforeEach(async function () {
            await poap.connect(minter).createLecture("Workshop", await time.latest(), "workshop-uri");
            lectureId = 1;
        });

        it("Should allow minter to set lecture active status", async function () {
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

        it("Should revert setting active status for invalid lecture ID", async function () {
            const invalidId = 999;

            await expect(
                poap.connect(minter).setLectureActive(invalidId, false)
            ).to.be.revertedWith("Invalid lecture ID");
        });

        it("Should revert if non-minter tries to change lecture status", async function () {
            await expect(
                poap.connect(attendees[0]).setLectureActive(lectureId, false)
            ).to.be.revertedWithCustomError(poap, "AccessControlUnauthorizedAccount");
        });
    });

    describe("Lecture Queries", function () {
        let lectureId: number;

        beforeEach(async function () {
            const timestamp = await time.latest();
            await poap.connect(minter).createLecture("Seminar", timestamp, "seminar-uri");
            lectureId = 1;
        });

        it("Should return correct lecture information", async function () {
            const lecture = await poap.getLecture(lectureId);

            expect(lecture.name).to.equal("Seminar");
            expect(lecture.active).to.be.true;
            expect(lecture.tokenURI).to.equal("seminar-uri");
        });

        it("Should return correct lecture count", async function () {
            expect(await poap.getLectureCount()).to.equal(1);

            // Add another lecture
            await poap.connect(minter).createLecture("Another Lecture", await time.latest(), "uri2");

            expect(await poap.getLectureCount()).to.equal(2);
        });

        it("Should revert querying invalid lecture ID", async function () {
            const invalidId = 999;

            await expect(
                poap.getLecture(invalidId)
            ).to.be.revertedWith("Invalid lecture ID");
        });

        it("Should return correct claimed status", async function () {
            const attendee = attendees[0];

            // Not claimed initially
            expect(await poap.hasClaimed(lectureId, attendee.address)).to.be.false;

            // Mint a POAP
            await poap.connect(minter).mintPOAP(lectureId, attendee.address);

            // Should be claimed now
            expect(await poap.hasClaimed(lectureId, attendee.address)).to.be.true;
        });
    });

    describe("URI Handling", function () {
        let lectureId: number;

        beforeEach(async function () {
            // Create lecture with specific URI
            await poap.connect(minter).createLecture("With URI", await time.latest(), "specific-uri");
            lectureId = 1;

            // Create lecture with empty URI
            await poap.connect(minter).createLecture("No URI", await time.latest(), "");
        });

        it("Should return specific URI when set", async function () {
            expect(await poap.uri(lectureId)).to.equal("specific-uri");
        });

        it("Should fall back to base URI when token URI is empty", async function () {
            const emptyURILectureId = 2;
            expect(await poap.uri(emptyURILectureId)).to.equal(baseURI);
        });

        it("Should revert for invalid token ID", async function () {
            const invalidId = 999;

            await expect(
                poap.uri(invalidId)
            ).to.be.revertedWith("Invalid token ID");
        });
    });

    describe("Pausing", function () {
        it("Should allow pauser to pause the contract", async function () {
            await poap.connect(pauser).pause();
            expect(await poap.paused()).to.be.true;
        });

        it("Should allow pauser to unpause the contract", async function () {
            await poap.connect(pauser).pause();
            await poap.connect(pauser).unpause();
            expect(await poap.paused()).to.be.false;
        });

        it("Should revert if non-pauser tries to pause", async function () {
            await expect(
                poap.connect(attendees[0]).pause()
            ).to.be.revertedWithCustomError(poap, "AccessControlUnauthorizedAccount");
        });

        it("Should revert if non-pauser tries to unpause", async function () {
            await poap.connect(pauser).pause();

            await expect(
                poap.connect(attendees[0]).unpause()
            ).to.be.revertedWithCustomError(poap, "AccessControlUnauthorizedAccount");
        });

        it("Should prevent token transfers when paused", async function () {
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

    describe("Interface Support", function () {
        it("Should support ERC1155 interface", async function () {
            const ERC1155InterfaceId = "0xd9b67a26";
            expect(await poap.supportsInterface(ERC1155InterfaceId)).to.be.true;
        });

        it("Should support AccessControl interface", async function () {
            const AccessControlInterfaceId = "0x7965db0b";
            expect(await poap.supportsInterface(AccessControlInterfaceId)).to.be.true;
        });
    });
});
