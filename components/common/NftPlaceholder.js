import React from 'react';

/**
 * A component that renders a simple SVG placeholder for NFT images
 */
const NftPlaceholder = ({ size = 200, text = 'NFT' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{ maxWidth: '100%' }}
    >
      <rect width="200" height="200" fill="#f0f0f0" />
      <path
        d="M40,40 L160,40 L160,160 L40,160 Z"
        stroke="#cccccc"
        strokeWidth="2"
        fill="none"
      />
      <text
        x="100"
        y="100"
        fontFamily="Arial, sans-serif"
        fontSize="24"
        textAnchor="middle"
        alignmentBaseline="middle"
        fill="#999999"
      >
        {text}
      </text>
      <path
        d="M68,132 L90,105 L107,120 L132,90 L132,132 Z"
        fill="#dddddd"
      />
      <circle cx="75" cy="75" r="12" fill="#dddddd" />
    </svg>
  );
};

export default NftPlaceholder;
