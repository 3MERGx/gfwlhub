"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import Toast from "./toast";

interface ToastContextType {
  showToast: (message: string, duration?: number, type?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<{
    message: string;
    duration: number;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, duration = 3000, type: "success" | "error" = "success") => {
    setToast({ message, duration, type });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          duration={toast.duration}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
