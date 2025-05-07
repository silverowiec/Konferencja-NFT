import { ethers } from 'ethers';

// ABI of the KoPOAP contract
const contractABI = [
  // Define only the functions we need for our app
  "function createLecture(string memory name, uint256 timestamp, string memory uri) public returns (uint256)",
  "function mintPOAP(uint256 lectureId, address attendee) public",
  "function getLecture(uint256 lectureId) external view returns (string memory name, uint256 timestamp, bool active, string memory tokenURI)",
  "function getLectureCount() external view returns (uint256)",
  "function hasClaimed(uint256 lectureId, address attendee) external view returns (bool)",
  "function lectureHashToId(bytes32 hash) external view returns (uint256)"
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

// Generate a lecture hash from the lecture data
export const generateLectureHash = (name, timestamp, tokenURI) => {
  // Create a combined string of the lecture data
  const combined = `${name}:${timestamp}:${tokenURI}`;
  
  // Generate keccak256 hash of the combined string
  const hash = ethers.keccak256(ethers.toUtf8Bytes(combined));
  
  return hash;
};

// Function to create a new lecture
export const createLecture = async (privateKey, name, timestamp, tokenURI) => {
  const contract = getWriteContract(privateKey);
  const tx = await contract.createLecture(name, timestamp, tokenURI);
  const receipt = await tx.wait();
  
  // Parse event to get lectureId
  const event = receipt.logs
    .map(log => {
      try {
        return contract.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    })
    .find(event => event && event.name === 'LectureCreated');
  
  // Generate hash for this lecture
  const lectureHash = generateLectureHash(name, timestamp, tokenURI);
  
  // Convert BigInt to number or string if needed
  return { 
    id: event ? handleBigInt(event.args.lectureId) : null,
    hash: lectureHash
  };
};

// Function to get lecture ID from hash
export const getLectureIdFromHash = async (lectureHash) => {
  try {
    const contract = getReadContract();
    const lectureId = await contract.lectureHashToId(lectureHash);
    return handleBigInt(lectureId);
  } catch (error) {
    console.error('Error getting lecture ID from hash:', error);
    return null;
  }
};

// Function to mint POAP for an attendee
export const mintPOAP = async (privateKey, lectureId, attendeeAddress) => {
  const contract = getWriteContract(privateKey);
  const tx = await contract.mintPOAP(lectureId, attendeeAddress);
  return await tx.wait();
};

// Function to get lecture details
export const getLecture = async (lectureId) => {
  const contract = getReadContract();
  const lecture = await contract.getLecture(lectureId);
  return {
    name: lecture[0],
    timestamp: handleBigInt(lecture[1]), // Convert timestamp BigInt to number
    active: lecture[2],
    tokenURI: lecture[3]
  };
};

// Function to get total lecture count
export const getLectureCount = async () => {
  const contract = getReadContract();
  const count = await contract.getLectureCount();
  // Convert BigInt to number
  return handleBigInt(count);
};

// Function to check if an attendee has claimed a POAP
export const hasClaimed = async (lectureId, attendeeAddress) => {
  const contract = getReadContract();
  return await contract.hasClaimed(lectureId, attendeeAddress);
};

// Function to get all lectures
export const getAllLectures = async () => {
  const contract = getReadContract();
  const count = await contract.getLectureCount();
  
  const lectures = [];
  // Convert count to number for the loop
  const countAsNumber = handleBigInt(count);
  
  for (let i = 1; i <= countAsNumber; i++) {
    try {
      const lecture = await getLecture(i);
      lectures.push({
        id: i,
        ...lecture
      });
    } catch (error) {
      console.error(`Error fetching lecture ${i}:`, error);
    }
  }
  
  return lectures;
};