'use client';

import { useState, useRef } from 'react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: Error) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [supportError, setSupportError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startScanning = async () => {
    try {
      const hasMedia =
        typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function';
      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const isSecure =
        typeof window !== 'undefined' &&
        ((window as any).isSecureContext === true || window.location.protocol === 'https:' || isLocalhost);

      if (!hasMedia) {
        const msg =
          'Camera access is not supported on this device or browser (navigator.mediaDevices.getUserMedia is unavailable).';
        setSupportError(msg);
        throw new Error(msg);
      }

      if (!isSecure) {
        const msg =
          'Camera requires a secure context (https or localhost). Please open this page over HTTPS or use localhost.';
        setSupportError(msg);
        throw new Error(msg);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          // Use "ideal" to improve compatibility across Android/iOS browsers
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });

      if (videoRef.current) {
        // iOS requires muted for autoplay
        try {
          (videoRef.current as any).muted = true;
        } catch {}
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setScanning(true);
      }
    } catch (err) {
      if (!supportError && typeof window !== 'undefined') {
        // Provide a helpful generic message if not already set
        setSupportError('Unable to start camera. Please check browser permissions and secure (https) context.');
      }
      if (onError) {
        onError(err as Error);
      }
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      onScan(value);
    }
  };

  return (
    <div className="space-y-4">
      {supportError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p className="text-sm">{supportError}</p>
          <p className="text-xs mt-1">
            Tip: On mobile, use HTTPS or connect via localhost. You can also paste the QR data manually below.
          </p>
        </div>
      )}
      {!scanning ? (
        <div className="text-center">
          <button
            onClick={startScanning}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700"
          >
            Start Camera Scanner
          </button>
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Or enter QR code data manually:</p>
            <input
              type="text"
              placeholder="Paste QR code data here"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              onChange={handleManualInput}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full max-w-md mx-auto rounded-lg border-4 border-primary-500"
          />
          <div className="text-center">
            <button
              onClick={stopScanning}
              className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600"
            >
              Stop Scanning
            </button>
          </div>
          <p className="text-center text-sm text-gray-600">
            Point your camera at a QR code. For production, integrate a QR code scanning library.
          </p>
        </div>
      )}
    </div>
  );
}

