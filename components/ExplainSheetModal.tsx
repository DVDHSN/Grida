import React, { useState, useEffect } from 'react';
import SpreadsheetModal from './SpreadsheetModal';
import Spinner from './Spinner';

interface ExplainSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  content: string;
}

declare global {
  interface Window {
    marked: any;
  }
}

const ExplainSheetModal: React.FC<ExplainSheetModalProps> = ({ isOpen, onClose, isLoading, content }) => {
  const [isMarkedLoaded, setIsMarkedLoaded] = useState(!!window.marked);
  const [copyStatus, setCopyStatus] = useState('Copy');
  
  useEffect(() => {
    if (isMarkedLoaded) return;
    const interval = setInterval(() => {
      if (window.marked) {
        setIsMarkedLoaded(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isMarkedLoaded]);

  useEffect(() => {
    if (isOpen) {
        setCopyStatus('Copy');
    }
  }, [isOpen]);

  const handleCopy = () => {
    if (!content || isLoading) return;
    navigator.clipboard.writeText(content).then(() => {
        setCopyStatus('Copied!');
        setTimeout(() => setCopyStatus('Copy'), 2000);
    }, err => {
        console.error('Could not copy text: ', err);
        alert('Failed to copy explanation.');
    });
  };

  return (
    <SpreadsheetModal isOpen={isOpen} onClose={onClose} title="AI Data Explanation">
       <style>{`
            .explanation-content h1, .explanation-content h2, .explanation-content h3 { margin-bottom: 0.5em; margin-top: 1em; font-weight: 600; border-bottom: 1px solid #333; padding-bottom: 0.25em; }
            .explanation-content h1 { font-size: 1.5em; font-family: 'Lora', serif; }
            .explanation-content h2 { font-size: 1.25em; font-family: 'Lora', serif; }
            .explanation-content h3 { font-size: 1.1em; }
            .explanation-content ul, .explanation-content ol { list-style-position: inside; padding-left: 1em; margin-bottom: 1em; }
            .explanation-content li { margin-bottom: 0.5em; }
            .explanation-content p { margin-bottom: 1em; line-height: 1.6; }
            .explanation-content p:last-child { margin-bottom: 0; }
            .explanation-content strong { font-weight: 600; color: #EBCFD2; }
            .explanation-content em { font-style: italic; }
            .explanation-content code { background-color: #121212; padding: 0.2em 0.4em; margin: 0; font-size: 85%; border-radius: 3px; border: 1px solid #333; }
            .explanation-content a { color: #A34D5D; text-decoration: underline; }
            .explanation-content blockquote { border-left: 3px solid #800020; padding-left: 1em; margin-left: 0; font-style: italic; color: #bbb; }
        `}</style>
        <div className="flex flex-col h-full">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center w-full h-full">
                    <Spinner />
                    <p className="text-gray-400 mt-2">AI is analyzing your sheet...</p>
                </div>
            ) : (
                <>
                    <div className="flex-shrink-0 flex justify-end pb-2 border-b border-[#333]">
                        <button
                            onClick={handleCopy}
                            disabled={!content || isLoading}
                            className="secondary-btn flex items-center gap-2 text-xs py-1 px-2"
                        >
                            {copyStatus === 'Copied!' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            )}
                           <span>{copyStatus}</span>
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto pt-4 explanation-content">
                        {isMarkedLoaded ? (
                            <div dangerouslySetInnerHTML={{ __html: window.marked.parse(content) }} />
                        ) : (
                            <pre className="whitespace-pre-wrap text-sm">{content}</pre>
                        )}
                    </div>
                </>
            )}
        </div>
    </SpreadsheetModal>
  );
};

export default ExplainSheetModal;
