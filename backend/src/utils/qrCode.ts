import crypto from 'crypto';
import { QRCodeData } from '../types/queue';

const QR_SECRET = process.env.QR_SECRET || 'qr-secret-key-change-in-production';

/**
* Generate QR code data for a queue entry
*/
export const generateQRData = (
queueId: string,
tokenNumber: number,
userId: string
): string => {
  // Use a bare UUID instead of a dense base64 string to make physical scanning flawless
  return queueId;
};

/**
 * Verify and decode QR code data
 */
export const verifyQRData = (qrData: string): any | null => {
  try {
    // Check if it matches our fast-scan UUID pattern strictly to avoid Postgres throwing 500
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (qrData && uuidRegex.test(qrData)) {
      return { queueId: qrData };
    }

    // Fallback for older tokens
    const decoded = Buffer.from(qrData, 'base64').toString('utf-8');
    const data: QRCodeData = JSON.parse(decoded);

    // Verify signature
    const payload = `${data.queueId}:${data.tokenNumber}:${data.userId}:${data.timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', QR_SECRET)
      .update(payload)
      .digest('hex');

    if (data.signature !== expectedSignature) {
      console.error('Invalid QR signature');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to verify QR code:', error);
    return null;
  }
};

/**
 * Generate QR code URL for frontend to render
 * Frontend will use this data to generate actual QR image
 */
export const generateQRCodeURL = (qrData: string): string => {
  // URL that frontend can use with QR code libraries
  // e.g., react-native-qrcode-svg or qrcode.react
  return qrData;
};