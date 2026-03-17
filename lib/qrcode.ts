import QRCode from 'qrcode';

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 300,
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

export function generateRestaurantQRData(restaurantId: number): string {
  // Generate URL that points to restaurant menu page
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/restaurant/${restaurantId}/menu-view`;
}

export function generateOrderQRData(orderId: number): string {
  // Encode a direct URL to the web app's order payment page so native cameras can open it
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/payment/order/${orderId}`;
}

export function parseQRData(qrData: string): { type: string; [key: string]: any } | null {
  try {
    const data = JSON.parse(qrData);
    return data;
  } catch (error) {
    return null;
  }
}

