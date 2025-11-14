import React, { useState, useEffect } from 'react';

interface AuditingToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

const AuditingToast: React.FC<AuditingToastProps> = ({ message, onClose, duration = 8000 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setIsVisible(true);

    const timer = setTimeout(() => {
      // Animate out
      setIsVisible(false);
      // Actual close after animation
      setTimeout(onClose, 300); 
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
      setIsVisible(false);
      setTimeout(onClose, 300);
  }

  return (
    <div className={`fixed bottom-5 right-5 w-full max-w-sm z-50 transition-all duration-300 ease-out ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
        <style>{`
            .toast-markdown-content h1, .toast-markdown-content h2, .toast-markdown-content h3 { margin-bottom: 0.25em; font-weight: 600; font-size: 1.1em; }
            .toast-markdown-content ul, .toast-markdown-content ol { list-style-position: inside; padding-left: 0.5em; margin-bottom: 0.5em; }
            .toast-markdown-content p { margin-bottom: 0.5em; line-height: 1.5; }
            .toast-markdown-content p:last-child { margin-bottom: 0; }
            .toast-markdown-content code { background-color: #121212; padding: 0.2em 0.4em; border-radius: 3px; }
        `}</style>
      <div className="bg-[#2A2A2A] rounded-lg shadow-2xl border border-[#444] p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#A34D5D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold text-[#E0E0E0] mb-1">AI Audit Result</p>
            <div className="text-sm text-gray-300 toast-markdown-content" dangerouslySetInnerHTML={{ __html: message }} />
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button onClick={handleClose} className="rounded-md inline-flex text-gray-400 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800020]">
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditingToast;
