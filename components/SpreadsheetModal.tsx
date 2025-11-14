import React from 'react';

interface SpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const SpreadsheetModal: React.FC<SpreadsheetModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div 
        className="bg-[#1E1E1E] rounded-lg shadow-xl w-full max-w-4xl h-[70vh] flex flex-col border border-[#333333] animate-scale-in"
        style={{ animationDuration: '0.3s' }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <header className="flex justify-between items-center p-4 border-b border-[#333333]">
          <h2 className="text-xl font-lora font-medium text-[#E0E0E0]">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-1 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-full"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="p-4 flex-grow overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SpreadsheetModal;