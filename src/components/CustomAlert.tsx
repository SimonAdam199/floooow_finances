import React from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';

export interface AlertModalConfig {
  isOpen: boolean;
  type?: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string; // If present, renders as a confirm dialog with cancel button
  onConfirm: () => void;
  onCancel?: () => void;
}

interface CustomAlertProps {
  config: AlertModalConfig | null;
  onClose: () => void;
}

export default function CustomAlert({ config, onClose }: CustomAlertProps) {
  if (!config || !config.isOpen) return null;

  const {
    type = 'info',
    title,
    message,
    confirmLabel = config.cancelLabel ? 'Potvrdiť' : 'Rozumiem',
    cancelLabel,
    onConfirm,
    onCancel
  } = config;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-7 max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl space-y-4 relative text-slate-800 dark:text-slate-100">
        <button 
          onClick={handleCancel}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5 pt-1">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
            type === 'danger' 
              ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/40 dark:border-rose-900/40 dark:text-rose-400' 
              : type === 'warning'
              ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:border-amber-900/40 dark:text-amber-400'
              : type === 'success'
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/40 dark:text-emerald-400'
              : 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/40 dark:text-indigo-400'
          }`}>
            {type === 'danger' && <ShieldAlert className="w-6 h-6" />}
            {type === 'warning' && <AlertTriangle className="w-6 h-6" />}
            {type === 'success' && <CheckCircle2 className="w-6 h-6" />}
            {type === 'info' && <Info className="w-6 h-6" />}
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {message}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2.5 justify-end">
          {cancelLabel && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`px-5 py-2 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-md ${
              type === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : type === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700'
                : type === 'success'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
