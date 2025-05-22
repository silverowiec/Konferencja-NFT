import { ethers } from 'ethers';

// Check if we're running in a browser environment
const isBrowser = typeof window !== 'undefined';

// ABI of the KoPOAP contract
const contractABI = [
  // Define only the functions we need for our app
  "function createLecture(string memory name, uint256 start, uint256 deadline, string memory uri) public",
  "function mintPOAP(bytes32 lectureHash, address attendee) public returns (uint256)",
  "function getLectureCount() external view returns (uint256)",
  "function hasClaimed(bytes32 lectureHash, address attendee) external view returns (uint256)",
  "function getTokensOfOwner(address owner) external view returns (uint256[] memory)",
  "function tokenURI(uint256 tokenId) public view returns (string memory)",
  "function lectureCounter(uint256) external view returns (bytes32)",
  "function getTokensOfOwner(address owner) external view returns (uint256[] memory)",
];

const lectureAbi = [
  {
    name: 'getLecture',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'lectureId', type: 'uint256' }
    ],
    outputs: [
      {
        name: 'lectureInfo',
        type: 'tuple',
        components: [
          { name: 'lectureHash', type: 'bytes32' },
          { name: 'name', type: 'string' },
          { name: 'start', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'tokenURI', type: 'string' }
        ]
      }
    ]
  },
  {
    name: 'getLectureByHash',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'lectureHash', type: 'bytes32' }
    ],
    outputs: [
      {
        name: 'lectureInfo',
        type: 'tuple',
        components: [
          { name: 'lectureHash', type: 'bytes32' },
          { name: 'name', type: 'string' },
          { name: 'start', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'tokenURI', type: 'string' }
        ]
      }
    ]
  }
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
  // Make sure we have a valid RPC URL
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  if (!rpcUrl) {
    console.error('RPC URL is not defined in environment variables');
    // Return a fallback provider or throw an error depending on your requirements
    return null;
  }
  
  try {
    return new ethers.JsonRpcProvider(rpcUrl);
  } catch (error) {
    console.error('Error creating provider:', error);
    return null;
  }
};

// Function to get read-only contract instance
export const getReadContract = () => {
  const provider = getProvider();
  
  // If provider is null, we can't create a contract
  if (!provider) {
    console.error('Could not create provider');
    return null;
  }
  
  try {
    return new ethers.Contract(contractAddress, contractABI, provider);
  } catch (error) {
    console.error('Error creating contract:', error);
    return null;
  }
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
export const createLecture = async (privateKey, name, start, deadline, tokenURI) => {
  const contract = getWriteContract(privateKey);
  const tx = await contract.createLecture(name, start, deadline, tokenURI);
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
export const mintPOAP = async (privateKey, lectureIdOrHash, attendeeAddress) => {
  const contract = getWriteContract(privateKey);
  
  // If it's already a hash (starts with 0x), use it directly
  if (typeof lectureIdOrHash === 'string' && lectureIdOrHash.startsWith('0x')) {
    const tx = await contract.mintPOAP(lectureIdOrHash, attendeeAddress);
    return await tx.wait();
  }
  
  // Otherwise, treat it as an ID and convert to hash
  try {
    const hash = await getLectureHashFromId(lectureIdOrHash);
    const tx = await contract.mintPOAP(hash, attendeeAddress);
    return tx;
  } catch (error) {
    console.error(`Error minting POAP for lecture ${lectureIdOrHash} to ${attendeeAddress}:`, error);
    throw error;
  }
};

// Function to get total lecture count
export const getLectureCount = async () => {
  const contract = getReadContract();
  const count = await contract.getLectureCount();
  // Convert BigInt to number
  return handleBigInt(count);
};

// Function to check if an attendee has claimed a POAP
export const hasClaimed = async (lectureIdOrHash, attendeeAddress) => {
  const contract = getReadContract();
  
  // If it's already a hash (starts with 0x), use it directly
  if (typeof lectureIdOrHash === 'string' && lectureIdOrHash.startsWith('0x')) {
    return (await contract.hasClaimed(lectureIdOrHash, attendeeAddress)).toString();
  }
  
  // Otherwise, treat it as an ID and convert to hash
  try {
    const hash = await getLectureHashFromId(lectureIdOrHash);
    return (await contract.hasClaimed(hash, attendeeAddress)).toString();
  } catch (error) {
    console.error(`Error checking if ${attendeeAddress} claimed lecture ${lectureIdOrHash}:`, error);
    throw error;
  }
};

// Function to get tokens owned by an address
export const getTokensOfOwner = async (address) => {
  try {
    const contract = getReadContract();
    if (!contract) {
      console.error('Failed to get contract for reading tokens');
      return [];
    }
    
    const tokens = await contract.getTokensOfOwner(address);
    return tokens.map(token => handleBigInt(token));
  } catch (error) {
    console.error('Error getting tokens of owner:', error);
    return [];
  }
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

// Function to get lecture info by hash
export const getLectureByHash = async (lectureHash) => {
  try {
    
    const contract = new ethers.Contract(
      contractAddress, 
      lectureAbi, 
      getProvider()
    );
    
    const lectureInfo = await contract.getLectureByHash(lectureHash);
    const name = lectureInfo.name;
    const deadline = handleBigInt(lectureInfo.deadline);
    const tokenURI = lectureInfo.tokenURI;
    const timeNow = Math.floor(Date.now() / 1000);

    return {
      name: name,
      deadline: deadline,
      timestamp: deadline,
      startTimestamp: handleBigInt(lectureInfo.start),
      active: Number(deadline) > timeNow && Number(lectureInfo.start) < timeNow,
      tokenURI: tokenURI,
      lectureHash: lectureHash
    };
  } catch (error) {
    console.error(`Error fetching lecture info for hash ${lectureHash}:`, error);
    return null;
  }
};

// Function to get all lectures - compatibility function for the old interface
export const getAllLectures = async () => {
  const count = await getLectureCount();
  const contract = new ethers.Contract(
    contractAddress, 
    lectureAbi, 
    getProvider()
  );
    
  const lectures = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const lecture = await contract.getLecture(i);
      if (lecture) {
        const timeNow = Math.floor(Date.now() / 1000);
        lectures.push({
          id: i,
          hash: lecture.lectureHash,
          name: lecture.name,
          timestamp: lecture.deadline,
          startTimestamp: lecture.start,
          active: Number(lecture.deadline) > timeNow && Number(lecture.start) < timeNow, // Active if deadline is in the future
          tokenURI: lecture.tokenURI,
          lectureHash: lecture.lectureHash,
        });
      }
    } catch (error) {
      console.error("Error processing lecture:", error);
    }
  }
  
  return lectures;
};

// Function to get lecture hash from ID (for backward compatibility)
export const getLectureHashFromId = async (lectureId) => {
  try {
    const index = Number.parseInt(lectureId) - 1; // Convert from 1-based to 0-based index
    if (index < 0) throw new Error("Invalid lecture ID");
    
    const hash = await getLectureHashByIndex(index);
    return hash;
  } catch (error) {
    console.error(`Error getting lecture hash for ID ${lectureId}:`, error);
    throw error;
  }
};

// Function to get lecture by ID (for backward compatibility)
export const getLecture = async (lectureHash) => {
  try {
    const contract = new ethers.Contract(
      contractAddress, 
      lectureAbi, 
      getProvider()
    );
    const lectureInfo = await contract.getLectureByHash(lectureHash);
    
    // Format it to match the old interface
    return {
      name: lectureInfo.name,
      timestamp: lectureInfo.deadline,
      startTimestamp: lectureInfo.start,
      active: Number(lectureInfo.deadline) > Math.floor(Date.now() / 1000) && Number(lectureInfo.start) < Math.floor(Date.now() / 1000),
      tokenURI: lectureInfo.tokenURI, 
      lectureHash: lectureInfo.lectureHash,
    };
  } catch (error) {
    console.error(`Error fetching lecture for hash ${lectureHash}:`, error);
    throw error;
  }
};

export const getLastTokenForOwner = async (address) => {
  const tokens  = await getTokensOfOwner(address);
  if (tokens.length === 0) {
    return null;
  }
  return tokens[tokens.length - 1];
};

/**
 * Converts an IPFS URI to a Pinata gateway URL
 * @param {string} ipfsUri - URI in format ipfs://HASH
 * @returns {string} URL in format https://coral-manual-lemming-337.mypinata.cloud/ipfs/HASH
 */
export const convertIpfsToHttpUrl = (ipfsUri) => {
  if (!ipfsUri) return '';
  
  // Check if the URI is already in HTTP format
  if (ipfsUri.startsWith('http')) return ipfsUri;
  
  // Convert IPFS URI to Pinata gateway URL
  if (ipfsUri.startsWith('ipfs://')) {
    const ipfsHash = ipfsUri.replace('ipfs://', '');
    return `https://coral-manual-lemming-337.mypinata.cloud/ipfs/${ipfsHash}`;
  }
  
  // Return original if not an IPFS URI
  return ipfsUri;
};

/**
 * Fetch metadata from URI
 * @param {string} uri - URI pointing to metadata JSON
 * @returns {Promise<Object>} Parsed metadata with properly formatted image URL
 */
export const fetchMetadata = async (uri) => {
  try {
    // Convert URI to HTTP URL if it's an IPFS URI
    const httpUrl = convertIpfsToHttpUrl(uri);
    if (!httpUrl) {
      throw new Error('Invalid URI provided');
    }
    
    console.log('Fetching metadata from URL:', httpUrl);
    
    // Fetch the metadata with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(httpUrl, { 
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status} ${response.statusText}`);
    }
    
    const metadata = await response.json();
    console.log('Raw metadata:', metadata);
    
    // Validate required fields
    if (!metadata.name) {
      console.warn('Metadata missing name field');
      metadata.name = 'Unnamed NFT';
    }
    
    if (!metadata.description) {
      console.warn('Metadata missing description field');
      metadata.description = 'No description available';
    }
    
    // Also convert image URI if it's IPFS
    if (metadata.image?.startsWith('ipfs://')) {
      metadata.image = convertIpfsToHttpUrl(metadata.image);
      console.log('Converted image URL:', metadata.image);
    }
    
    // Ensure image exists, use placeholder if not
    if (!metadata.image) {
      metadata.image = 'https://placehold.co/400x400?text=NFT';
      console.log('Using placeholder image');
    }
    
    // Ensure attributes array exists
    if (!metadata?.attributes || !Array.isArray(metadata?.attributes)) {
      metadata.attributes = [];
    }
    
    return metadata;
  } catch (error) {
    console.error('Error fetching metadata:', error);
    // Return minimal metadata with placeholder instead of throwing
    return {
      name: 'Error Loading NFT',
      description: 'Could not load token metadata',
      image: 'https://placehold.co/400x400?text=Error',
      attributes: []
    };
  }
}
