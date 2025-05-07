import QRCode from 'qrcode';

// Generate QR code as data URL using lecture hash
export async function generateQRCode(lectureHash, baseUrl = '') {
  // URL that will handle QR code scanning with the lecture hash
  const scanUrl = `${baseUrl}/scan#${lectureHash.substring(2)}`; // Remove 0x prefix
  
  try {
    // Generate QR code as data URL with medium error correction
    const dataUrl = await QRCode.toDataURL(scanUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    
    return { 
      dataUrl,
      scanUrl
    };
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

// Generate QR code and save to a file
export async function saveQRCode(lectureHash, filePath, baseUrl = '') {
  // URL that will handle QR code scanning
  const scanUrl = `${baseUrl}/scan#${lectureHash.substring(2)}`; // Remove 0x prefix
  
  try {
    // Generate QR code and save to file with medium error correction
    await QRCode.toFile(filePath, scanUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    
    return { 
      filePath,
      scanUrl
    };
  } catch (error) {
    console.error('Error saving QR code:', error);
    throw new Error('Failed to save QR code');
  }
}