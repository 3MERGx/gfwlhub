"use client";

import { useState, useEffect } from "react";
import { FaTimes, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";

interface ToastProps {
  message: string;
  duration?: number;
  type?: "success" | "error";
  onClose?: () => void;
}

export const Toast = ({ message, duration = 3000, type = "success", onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const isError = type === "error";
  const borderColor = isError ? "border-red-500" : "border-[#107c10]";
  const iconColor = isError ? "text-red-500" : "text-[#107c10]";
  const Icon = isError ? FaExclamationCircle : FaCheckCircle;

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center bg-[#202020] text-white px-4 py-3 rounded-lg shadow-lg border-l-4 ${borderColor} max-w-md`}>
      <Icon className={`${iconColor} mr-3`} />
      <p className="flex-1">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          if (onClose) onClose();
        }}
        className="ml-3 text-gray-400 hover:text-white"
      >
        <FaTimes />
      </button>
    </div>
  );
};

export default Toast;
