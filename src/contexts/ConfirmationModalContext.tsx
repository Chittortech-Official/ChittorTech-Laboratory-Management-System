'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CentralConfirmationModal } from '@/components/common/CentralConfirmationModal';

export type ConfirmationOperationType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'export' 
  | 'email' 
  | 'profile' 
  | 'default'
  | 'error';

export interface ConfirmationOptions {
  type?: ConfirmationOperationType;
  title?: string;
  message?: string;
  description?: string;
  duration?: number; // Milliseconds before auto-dismiss (default 2800ms)
  onDismiss?: () => void;
}

interface ConfirmationModalContextType {
  showSuccess: (options?: ConfirmationOptions | string) => void;
  showError: (options?: ConfirmationOptions | string) => void;
  closeModal: () => void;
  isOpen: boolean;
}

const ConfirmationModalContext = createContext<ConfirmationModalContextType | undefined>(undefined);

export const ConfirmationModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    type: ConfirmationOperationType;
    title: string;
    message: string;
    description?: string;
    duration: number;
    onDismiss?: () => void;
  }>({
    type: 'default',
    title: 'Operation Successful',
    message: 'Your operation has been successfully saved to the database.',
    duration: 2800,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getStandardSuccessMessage = (type: ConfirmationOperationType): string => {
    switch (type) {
      case 'create':
        return 'Your record has been successfully saved to the database.';
      case 'update':
        return 'Your changes have been successfully saved to the database.';
      case 'delete':
        return 'Your record has been successfully deleted from the database.';
      case 'export':
        return 'Your file has been successfully generated.';
      case 'email':
        return 'Your report has been successfully sent.';
      case 'profile':
        return 'Your profile has been successfully updated.';
      case 'default':
      default:
        return 'Your operation has been successfully saved to the database.';
    }
  };

  const getStandardTitle = (type: ConfirmationOperationType): string => {
    switch (type) {
      case 'create':
        return 'Record Created';
      case 'update':
        return 'Changes Saved';
      case 'delete':
        return 'Record Removed';
      case 'export':
        return 'Export Complete';
      case 'email':
        return 'Report Dispatched';
      case 'profile':
        return 'Profile Updated';
      case 'error':
        return 'Operation Failed';
      case 'default':
      default:
        return 'Success Confirmed';
    }
  };

  const closeModal = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsOpen(false);
    if (modalData.onDismiss) {
      modalData.onDismiss();
    }
  }, [modalData]);

  const showSuccess = useCallback((options?: ConfirmationOptions | string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    let resolvedOptions: ConfirmationOptions = {};
    if (typeof options === 'string') {
      resolvedOptions = { message: options };
    } else if (options) {
      resolvedOptions = options;
    }

    const opType: ConfirmationOperationType = resolvedOptions.type || 'default';
    const finalMessage = resolvedOptions.message || getStandardSuccessMessage(opType);
    const finalTitle = resolvedOptions.title || getStandardTitle(opType);
    const duration = resolvedOptions.duration ?? 2800;

    setModalData({
      type: opType,
      title: finalTitle,
      message: finalMessage,
      description: resolvedOptions.description,
      duration,
      onDismiss: resolvedOptions.onDismiss,
    });

    setIsOpen(true);

    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        setIsOpen(false);
        if (resolvedOptions.onDismiss) {
          resolvedOptions.onDismiss();
        }
      }, duration);
    }
  }, []);

  const showError = useCallback((options?: ConfirmationOptions | string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    let resolvedOptions: ConfirmationOptions = {};
    if (typeof options === 'string') {
      resolvedOptions = { message: options };
    } else if (options) {
      resolvedOptions = options;
    }

    const duration = resolvedOptions.duration ?? 4500; // Keep errors slightly longer

    setModalData({
      type: 'error',
      title: resolvedOptions.title || 'Operation Failed',
      message: resolvedOptions.message || 'An unexpected error occurred while processing the request.',
      description: resolvedOptions.description,
      duration,
      onDismiss: resolvedOptions.onDismiss,
    });

    setIsOpen(true);

    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        setIsOpen(false);
        if (resolvedOptions.onDismiss) {
          resolvedOptions.onDismiss();
        }
      }, duration);
    }
  }, []);

  return (
    <ConfirmationModalContext.Provider
      value={{
        showSuccess,
        showError,
        closeModal,
        isOpen,
      }}
    >
      {children}
      <CentralConfirmationModal
        isOpen={isOpen}
        onClose={closeModal}
        type={modalData.type}
        title={modalData.title}
        message={modalData.message}
        description={modalData.description}
        duration={modalData.duration}
      />
    </ConfirmationModalContext.Provider>
  );
};

export const useConfirmationModal = (): ConfirmationModalContextType => {
  const context = useContext(ConfirmationModalContext);
  if (!context) {
    throw new Error('useConfirmationModal must be used within a ConfirmationModalProvider');
  }
  return context;
};

// Aliased as useNotification for convenience
export const useNotification = useConfirmationModal;

