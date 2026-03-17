'use client';

import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  showCloseButton?: boolean;
  autoClose?: number; // Auto close after milliseconds
}

export default function Modal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  showCloseButton = true,
  autoClose,
}: ModalProps) {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const typeStyles = {
    success: {
      icon: '✓',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      titleColor: 'text-green-800',
      messageColor: 'text-green-700',
      buttonColor: 'bg-green-600 hover:bg-green-700',
    },
    error: {
      icon: '✕',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
      buttonColor: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: '⚠',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    },
    info: {
      icon: 'ℹ',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const styles = typeStyles[type];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative bg-white rounded-lg shadow-xl max-w-md w-full ${styles.bgColor} border-2 ${styles.borderColor}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            >
              <span className="text-2xl">&times;</span>
            </button>
          )}

          {/* Content */}
          <div className="p-6">
            <div className="flex items-start">
              <div className={`flex-shrink-0 text-4xl ${styles.iconColor} mr-4`}>
                {styles.icon}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${styles.titleColor} mb-2`}>
                  {title}
                </h3>
                <p className={`${styles.messageColor} whitespace-pre-line`}>
                  {message}
                </p>
              </div>
            </div>

            {/* Action button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className={`${styles.buttonColor} text-white px-6 py-2 rounded-lg font-semibold transition`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

