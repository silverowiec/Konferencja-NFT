import { ethers } from 'ethers';

// ABI of the KoPOAP contract
const contractABI = [
  // Define only the functions we need for our app
  "function createLecture(string memory name, uint256 deadline, string memory uri) public",
  "function mintPOAP(bytes32 lectureHash, address attendee) public returns (uint256)",
  "function getLectureCount() external view returns (uint256)",
  "function hasClaimed(bytes32 lectureHash, address attendee) external view returns (bool)",
  "function getTokensOfOwner(address owner) external view returns (uint256[] memory)",
  "function getLecture(uint256 lectureId) external view returns (string memory name, uint256 timestamp, bool active, string memory tokenURI)",
  "function tokenURI(uint256 tokenId) public view returns (string memory)"
];

// Contract address from environment variables
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

// Helper function to safely convert BigInt to number or string
const handleBigInt = (value) => {
  if (typeof value === 'bigint') {
    // If the number is small enough to be safely represented as a JavaScript number
    if (value <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number(value);
    }
    // Otherwise return as a string to maintain precision
    return value.toString();
  }
  return value;
};

// Function to get provider based on environment
export const getProvider = () => {
  return new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
};

// Function to get read-only contract instance
export const getReadContract = () => {
  const provider = getProvider();
  return new ethers.Contract(contractAddress, contractABI, provider);
};

// Function to get write contract instance (with signer)
export const getWriteContract = (privateKey) => {
  const provider = getProvider();
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, contractABI, wallet);
};

// Calculate lecture hash from parameters
export const calculateLectureHash = (name, deadline, uri) => {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "uint256", "string"],
      [name, deadline, uri]
    )
  );
};

// Function to create a new lecture
export const createLecture = async (privateKey, name, deadline, tokenURI) => {
  const contract = getWriteContract(privateKey);
  const tx = await contract.createLecture(name, deadline, tokenURI);
  const receipt = await tx.wait();
  
  // Calculate the lecture hash that would have been created
  const lectureHash = calculateLectureHash(name, deadline, tokenURI);
  
  // Parse event to confirm creation
  const event = receipt.logs
    .map(log => {
      try {
        return contract.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    })
    .find(event => event && event.name === 'LectureCreated');
  
  // Return the lecture hash if the event was found and matches
  return event && event.args[0] === lectureHash ? lectureHash : null;
};

// Function to mint POAP for an attendee
export const mintPOAP = async (privateKey, lectureHash, attendeeAddress) => {
  const contract = getWriteContract(privateKey);
  const tx = await contract.mintPOAP(lectureHash, attendeeAddress);
  return await tx.wait();
};

// Function to get total lecture count
export const getLectureCount = async () => {
  const contract = getReadContract();
  const count = await contract.getLectureCount();
  // Convert BigInt to number
  return handleBigInt(count);
};

// Function to check if an attendee has claimed a POAP
export const hasClaimed = async (lectureHash, attendeeAddress) => {
  const contract = getReadContract();
  return await contract.hasClaimed(lectureHash, attendeeAddress);
};

// Function to get tokens owned by an address
export const getTokensOfOwner = async (address) => {
  const contract = getReadContract();
  const tokens = await contract.getTokensOfOwner(address);
  return tokens.map(token => handleBigInt(token));
};

// Function to get lecture hash by index
export const getLectureHashByIndex = async (index) => {
  const contract = getReadContract();
  return await contract.lectureCounter(index);
};

// Function to get all lecture hashes
export const getAllLectureHashes = async () => {
  const contract = getReadContract();
  const count = await contract.getLectureCount();
  const countAsNumber = handleBigInt(count);
  
  const lectureHashes = [];
  for (let i = 0; i < countAsNumber; i++) {
    try {
      const hash = await contract.lectureCounter(i);
      lectureHashes.push(hash);
    } catch (error) {
      console.error(`Error fetching lecture hash ${i}:`, error);
    }
  }
  
  return lectureHashes;
};