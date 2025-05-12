import QRCode from 'qrcode';

// Generate QR code as data URL - using lecture hash directly in the QR code
export async function generateQRCode(lectureHash, baseUrl = '') {
  // URL that attendees will be redirected to for minting
  // Now we use the hash directly in the URL
  const attendUrl = lectureHash;
  
  try {
    // Generate QR code as data URL with medium error correction
    const dataUrl = await QRCode.toDataURL(attendUrl, {
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
      scanUrl: attendUrl
    };
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

// Generate QR code and save to a file
export async function saveQRCode(lectureHash, filePath, baseUrl = '') {
  // URL that attendees will be redirected to for minting
  // Now we use the hash directly in the URL
  const attendUrl = lectureHash;
  
  try {
    // Generate QR code and save to file with medium error correction
    await QRCode.toFile(filePath, attendUrl, {
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
      scanUrl: attendUrl
    };
  } catch (error) {
    console.error('Error saving QR code:', error);
    throw new Error('Failed to save QR code');
  }
}