import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = 'danger',
  onConfirm,
  onCancel
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  // Use theme tokens for better consistency
                  type === 'danger' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                )}>
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {message}
                  </p>
                </div>
                <button 
                  onClick={onCancel}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="bg-secondary/30 p-4 flex justify-end gap-3 border-t border-border">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg text-sm font-bold text-muted-foreground hover:bg-secondary transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all hover:scale-105",
                  // Use theme tokens strictly
                  type === 'danger' 
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/20" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
                )}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
