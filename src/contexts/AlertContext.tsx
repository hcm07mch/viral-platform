'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Alert, { AlertType } from '@/components/Alert';

interface AlertContextType {
  showAlert: (message: string, type?: AlertType, duration?: number) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<{
    message: string;
    type: AlertType;
    duration: number;
  } | null>(null);

  const showAlert = useCallback((
    message: string, 
    type: AlertType = 'info', 
    duration: number = 3000
  ) => {
    setAlert({ message, type, duration });
  }, []);

  const closeAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <Alert
          message={alert.message}
          type={alert.type}
          duration={alert.duration}
          onClose={closeAlert}
        />
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
