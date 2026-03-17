import { useState, useCallback } from 'react';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  autoClose?: number;
}

export function useModal() {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showModal = useCallback(
    (
      title: string,
      message: string,
      type: 'success' | 'error' | 'info' | 'warning' = 'info',
      autoClose?: number
    ) => {
      setModal({
        isOpen: true,
        title,
        message,
        type,
        autoClose,
      });
    },
    []
  );

  const hideModal = useCallback(() => {
    setModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const showSuccess = useCallback(
    (message: string, title: string = 'Success', autoClose?: number) => {
      showModal(title, message, 'success', autoClose);
    },
    [showModal]
  );

  const showError = useCallback(
    (message: string, title: string = 'Error', autoClose?: number) => {
      showModal(title, message, 'error', autoClose);
    },
    [showModal]
  );

  const showInfo = useCallback(
    (message: string, title: string = 'Information', autoClose?: number) => {
      showModal(title, message, 'info', autoClose);
    },
    [showModal]
  );

  const showWarning = useCallback(
    (message: string, title: string = 'Warning', autoClose?: number) => {
      showModal(title, message, 'warning', autoClose);
    },
    [showModal]
  );

  return {
    modal,
    showModal,
    hideModal,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };
}

