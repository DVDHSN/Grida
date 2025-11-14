

import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, ChartTemplate, ToolCall } from '../types';
import Spinner from './Spinner';
import ChartDisplay from './ChartDisplay';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    marked: any;
  }
}

interface ChatPanelProps {
  initialInsights: string;
  suggestedQuestions: string[];
  chatHistory: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onStopGeneration: () => void;
  onClose: () => void;
  chartTemplates: ChartTemplate[];
  onSaveChartTemplate: (name: string, options: any) => void;
  isOpen: boolean;
}

const AiIcon: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#800020] to-[#60233D] flex-shrink-0 flex items-center justify-center shadow-md">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
    </div>
);

const UserIcon: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-[#3A3A3A] flex-shrink-0 flex items-center justify-center shadow-md">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    </div>
);

const ToolCallDisplay: React.FC<{ toolCalls: ToolCall[], query?: string }> = ({ toolCalls }) => {
    return (
        <div className="border border-[#444] bg-[#2a2a2a]/50 rounded-lg p-3 my-2 text-sm">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Spinner />
                <span>Running tools...</span>
            </div>
            <ul className="space-y-1">
                {toolCalls.map((tc) => (
                    <li key={tc.id} className="text-xs font-mono bg-[#121212] p-2 rounded">
                        <span className="text-[#A34D5D]">{tc.name}</span>
                        <span className="text-gray-300">({JSON.stringify(tc.args)})</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const WelcomeView: React.FC<{ insights: string; questions: string[]; onQuestionClick: (q: string) => void }> = ({ insights, questions, onQuestionClick }) => (
    <div className="text-left animate-fade-in space-y-4">
        <div>
            <h3 className="text-lg font-lora font-medium text-white">Initial Insights</h3>
            <p className="text-sm text-gray-400 mt-1">{insights}</p>
        </div>
        <div>
            <h4 className="text-md font-lora text-gray-200 mb-2">Try these suggestions:</h4>
            <div className="flex flex-col gap-2">
                {questions.map((q, i) => (
                    <button 
                        key={i} 
                        onClick={() => onQuestionClick(q)} 
                        className="w-full text-left text-sm p-3 bg-[#2a2a2a] hover:bg-[#333] rounded-lg transition-colors duration-200"
                    >
                        {q}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

const ChatPanel: React.FC<ChatPanelProps> = ({ initialInsights, suggestedQuestions, chatHistory, isLoading, onSendMessage, onClose, chartTemplates, onSaveChartTemplate, isOpen, onStopGeneration }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMarkedLoaded, setIsMarkedLoaded] = useState(!!window.marked);
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setQuery(transcript);
            handleSend(transcript);
        };
        recognitionRef.current = recognition;
    }
  }, []);

  const handleSend = (message: string) => {
    const finalMessage = message.trim();
    if (finalMessage) {
        onSendMessage(finalMessage);
        setQuery('');
    }
  };

  const handleMicClick = () => {
    if (isListening) {
        recognitionRef.current?.stop();
    } else {
        recognitionRef.current?.start();
    }
  };

  return (
    <div className={`bg-[#1a1a1a]/80 backdrop-blur-md border border-[#333] rounded-lg flex flex-col h-full shadow-2xl w-full ${isOpen ? 'animate-fade-in' : ''}`}>
        <style>{`
            .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin-bottom: 0.5em; font-weight: 600; }
            .markdown-content ul, .markdown-content ol { list-style-position: inside; padding-left: 1em; margin-bottom: 1em; }
            .markdown-content p { margin-bottom: 0.75em; line-height: 1.6; }
            .markdown-content p:last-child { margin-bottom: 0; }
            .markdown-content code { background-color: #121212; padding: 0.2em 0.4em; border-radius: 3px; }
            .markdown-content a { color: #EBCFD2; text-decoration: underline; }
        `}</style>
        
        <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-[#333]">
            <div className="flex items-center gap-2">
                <AiIcon />
                <h2 className="text-lg font-lora font-medium text-white">Copilot</h2>
            </div>
            <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-full"
                aria-label="Close chat panel"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </header>

        <div className="flex-grow overflow-y-auto p-4 space-y-6">
            {chatHistory.length <= 1 ? (
                <WelcomeView insights={initialInsights} questions={suggestedQuestions} onQuestionClick={(q) => handleSend(q)} />
            ) : (
                chatHistory.slice(1).map((msg, index) => (
                    <div key={index} className={`flex gap-3 animate-slide-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && <AiIcon />}
                        <div className={`w-auto max-w-[85%] px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-[#800020] text-white rounded-br-none' : 'bg-[#2A2A2A] text-[#E0E0E0] rounded-bl-none'}`}>
                            {msg.role !== 'tool' && msg.parts.map((part, i) => {
                                const textContent = (part as any).text;
                                if (msg.role === 'model' && textContent && isMarkedLoaded) {
                                    return <div key={i} className="markdown-content" dangerouslySetInnerHTML={{ __html: window.marked.parse(textContent) }} />;
                                }
                                return <p key={i}>{textContent}</p>;
                            })}
                            {msg.role === 'model' && msg.toolCalls && <ToolCallDisplay toolCalls={msg.toolCalls} query={msg.query} />}
                            {msg.chart && <div className="mt-2 bg-[#121212] rounded-md overflow-hidden"><ChartDisplay chart={msg.chart} templates={chartTemplates} onSaveTemplate={onSaveChartTemplate} /></div>}
                        </div>
                         {msg.role === 'user' && <UserIcon />}
                    </div>
                ))
            )}
            {isLoading && (
              <div className="flex gap-3 animate-fade-in">
                  <AiIcon />
                  <div className="w-auto max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-none bg-[#2A2A2A] flex items-center">
                    <Spinner />
                    <span className="ml-2 text-gray-400 text-sm">Thinking...</span>
                    <button 
                        onClick={onStopGeneration}
                        className="ml-4 text-xs text-gray-300 hover:text-white border border-gray-500 hover:border-gray-400 rounded-md px-2 py-0.5 transition-colors"
                    >
                        Stop
                    </button>
                  </div>
              </div>
            )}
            <div ref={messagesEndRef} />
        </div>
        
        <div className="flex-shrink-0 p-3 border-t border-[#333]">
            <div className="relative flex items-center">
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(query); } }}
                    placeholder={isListening ? "Listening..." : "Ask a question or give a command..."}
                    className="w-full p-3 pr-24 bg-[#2A2A2A] border border-[#444] rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020] duration-200 text-[#E0E0E0] placeholder-gray-500 resize-none"
                    rows={1}
                    disabled={isLoading}
                />
                <div className="absolute right-2 flex items-center gap-1">
                    {recognitionRef.current && (
                        <button onClick={handleMicClick} disabled={isLoading} className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-700/50 text-white animate-pulse' : 'text-gray-400 hover:bg-[#3A3A3A] hover:text-white'}`} title="Use voice">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>
                    )}
                    <button onClick={() => handleSend(query)} disabled={isLoading || !query.trim()} className="p-2 bg-[#800020] text-white rounded-full disabled:bg-[#333] disabled:text-gray-500 hover:bg-[#990026]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ChatPanel;