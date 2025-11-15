'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'danger' | 'success';
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ConfirmContextType {
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        isOpen: true,
        onConfirm: () => {
          setConfirmState(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(null);
          resolve(false);
        },
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {confirmState?.isOpen && (
        <div 
          className="confirm-backdrop"
          onClick={confirmState.onCancel}
        >
          <div 
            className="confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            {confirmState.title && (
              <div className="confirm-header">
                <h3>{confirmState.title}</h3>
              </div>
            )}
            <div className="confirm-body">
              <p>{confirmState.message}</p>
            </div>
            <div className="confirm-footer">
              <button
                className="confirm-dialog-btn confirm-dialog-btn-cancel"
                onClick={confirmState.onCancel}
              >
                {confirmState.cancelText || '취소'}
              </button>
              <button
                className={`confirm-dialog-btn confirm-dialog-btn-${confirmState.confirmColor || 'primary'}`}
                onClick={confirmState.onConfirm}
              >
                {confirmState.confirmText || '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .confirm-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out;
        }

        .confirm-dialog {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          min-width: 320px;
          max-width: 480px;
          overflow: hidden;
          animation: slideUp 0.2s ease-out;
        }

        .confirm-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .confirm-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .confirm-body {
          padding: 24px;
        }

        .confirm-body p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          color: #374151;
          white-space: pre-wrap;
        }

        .confirm-footer {
          padding: 16px 24px;
          background-color: #f9fafb;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .confirm-dialog-btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
        }

        .confirm-dialog-btn-cancel {
          background-color: #ffffff;
          color: #6b7280;
          border: 1px solid #d1d5db;
        }

        .confirm-dialog-btn-cancel:hover {
          background-color: #f9fafb;
          border-color: #9ca3af;
          color: #374151;
        }

        .confirm-dialog-btn-primary {
          background-color: #ffffff;
          color: #667eea;
          border: 1px solid #667eea;
        }

        .confirm-dialog-btn-primary:hover {
          background-color: #667eea;
          color: #ffffff;
        }

        .confirm-dialog-btn-danger {
          background-color: #ffffff;
          color: #dc2626;
          border: 1px solid #dc2626;
        }

        .confirm-dialog-btn-danger:hover {
          background-color: #dc2626;
          color: #ffffff;
        }

        .confirm-dialog-btn-success {
          background-color: #ffffff;
          color: #10b981;
          border: 1px solid #10b981;
        }

        .confirm-dialog-btn-success:hover {
          background-color: #10b981;
          color: #ffffff;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
