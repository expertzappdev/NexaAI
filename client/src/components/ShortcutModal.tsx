import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Focus conversation search' },
  { keys: ['Ctrl', 'Shift', 'N'], description: 'Create new chat' },
  { keys: ['Ctrl', '/'], description: 'Focus chat input' },
  { keys: ['Esc'], description: 'Close dialogs or menus' },
  { keys: ['Arrow Up'], description: 'Edit last user message (when input is empty)' },
  { keys: ['Ctrl', 'Enter'], description: 'Send message (always)' },
  { keys: ['Enter'], description: 'Send message (if multiline mode is disabled)' },
  { keys: ['Shift', 'Enter'], description: 'Insert new line' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
];

const ShortcutModal: React.FC<ShortcutModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="relative w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-850 shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition focus:outline-none cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between text-xs py-1">
              <span className="text-zinc-400 font-medium">{shortcut.description}</span>
              <div className="flex items-center space-x-1.5">
                {shortcut.keys.map((key, keyIndex) => (
                  <React.Fragment key={keyIndex}>
                    {keyIndex > 0 && <span className="text-[10px] text-zinc-600 font-bold">+</span>}
                    <kbd className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-300 font-mono shadow-sm">
                      {key}
                    </kbd>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-zinc-900 text-center">
          <p className="text-[10px] text-zinc-500 font-medium">
            Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-bold">?</kbd> at any time to open this help menu.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutModal;
