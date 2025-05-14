import React from 'react';

/**
 * A component that renders a visually appealing SVG placeholder for NFT images
 * 
 * @param {Object} props Component props
 * @param {number} props.size - The size of the SVG in pixels
 * @param {string} props.text - The text to display in the placeholder
 * @param {string} props.bgColor - Background color 
 */
const NftPlaceholder = ({ size = 200, text = 'NFT', bgColor = '#f0f0f0' }) => {
  // Generate a consistent color based on text
  const getConsistentColor = (text) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate HSL color with fixed saturation and lightness for better aesthetics
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 60%)`;
  };
  
  // Get color based on the text
  const mainColor = getConsistentColor(text);
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{ maxWidth: '100%', borderRadius: '8px' }}
    >
      {/* Background */}
      <rect width="200" height="200" fill={bgColor} />
      
      {/* Border */}
      <rect 
        x="10" 
        y="10" 
        width="180" 
        height="180" 
        rx="8" 
        fill="none" 
        stroke={mainColor} 
        strokeWidth="3" 
      />
      
      {/* Decorative elements */}
      <circle cx="160" cy="40" r="15" fill={mainColor} fillOpacity="0.5" />
      <circle cx="40" cy="160" r="15" fill={mainColor} fillOpacity="0.5" />
      
      {/* NFT icon */}
      <path
        d="M80,90 L120,90 L120,130 L80,130 Z"
        stroke={mainColor}
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M85,115 L95,102 L102,110 L115,95 L115,115 Z"
        fill={mainColor}
      />
      <circle cx="95" cy="98" r="5" fill={mainColor} />
      
      {/* Text */}
      <text
        x="100"
        y="155"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        textAnchor="middle"
        alignmentBaseline="middle"
        fill="#555555"
      >
        {text}
      </text>
      
      {/* Subtle grid pattern */}
      <path
        d="M0,40 L200,40 M0,80 L200,80 M0,120 L200,120 M0,160 L200,160 M40,0 L40,200 M80,0 L80,200 M120,0 L120,200 M160,0 L160,200"
        stroke="#00000010"
        strokeWidth="1"
      />
    </svg>
  );
};

export default NftPlaceholder;
