
import React, { useState, useEffect } from 'react';
import { performConversationalGoalSeek } from '../services/geminiService';
import type { ConversationalGoalSeekResponse } from '../types';
import Spinner from './Spinner';
import SpreadsheetModal from './SpreadsheetModal';

interface GoalSeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, any>[];
  onApply: (result: ConversationalGoalSeekResponse) => void;
  initialResult?: ConversationalGoalSeekResponse | null;
}

const GoalSeekModal: React.FC<GoalSeekModalProps> = ({ isOpen, onClose, data, onApply, initialResult }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ConversationalGoalSeekResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setResult(initialResult || null);
      // If there's an initial result, we don't need the query input
      if (initialResult) {
          setQuery("Pre-calculated by AI");
      } else {
          setQuery('');
      }
    }
  }, [isOpen, initialResult]);

  const handleSolve = async () => {
    if (!query) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await performConversationalGoalSeek(data, query);
      if (response) {
        setResult(response);
      } else {
        setError("The AI could not determine a solution from your query. Please try rephrasing it.");
      }
    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApply(result);
      handleClose();
    }
  };

  const handleClose = () => {
    setQuery('');
    setResult(null);
    setError(null);
    setIsLoading(false);
    onClose();
  }

  return (
    <SpreadsheetModal isOpen={isOpen} onClose={handleClose} title="Conversational Goal Seek">
        <div className="p-6 space-y-4">
            {!initialResult && (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">What is your goal?</label>
                    <textarea 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g., 'Set the total Sales to $50,000 by changing the price of the item in row 5.'"
                        className="modal-input h-24"
                    />
                </div>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}
            
            {isLoading && (
                <div className="flex items-center justify-center p-4 bg-[#121212] rounded-md">
                    <Spinner />
                    <span className="ml-3 text-gray-300">AI is calculating...</span>
                </div>
            )}
            
            {result && (
                <div className="p-4 bg-[#2a2a2a] rounded-lg border border-[#333] space-y-2 animate-fade-in">
                    <h3 className="font-semibold text-lg text-[#E0E0E0]">AI Solution:</h3>
                    <p className="text-gray-300">
                        To achieve your goal, set cell <code className="bg-[#121212] p-1 rounded">{result.cellToChange.columnHeader}{result.cellToChange.rowIndex + 1}</code> to: 
                        <strong className="text-xl text-white ml-2">{result.newValue.toLocaleString()}</strong>
                    </p>
                    <p className="text-sm text-gray-400 pt-2 border-t border-[#444]">
                        <strong>Reasoning:</strong> {result.reasoning}
                    </p>
                </div>
            )}
        </div>
        <footer className="flex justify-end gap-2 p-4 border-t border-[#333] bg-[#121212] rounded-b-lg">
            <button onClick={handleClose} className="cancel-btn">Cancel</button>
            {!initialResult && <button onClick={handleSolve} disabled={isLoading || !query} className="action-btn">{isLoading ? <Spinner /> : "Solve"}</button>}
            <button onClick={handleApply} disabled={!result} className="action-btn">Apply to Sheet</button>
        </footer>
    </SpreadsheetModal>
  );
};

export default GoalSeekModal;
