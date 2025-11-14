import React, { useState } from 'react';
import type { FormattingRule } from '../types';
import SpreadsheetModal from './SpreadsheetModal';
import { generateFormattingRule } from '../services/geminiService';
import Spinner from './Spinner';

interface ConditionalFormattingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (rule: Omit<FormattingRule, 'range'>) => void;
}

const ConditionalFormattingModal: React.FC<ConditionalFormattingModalProps> = ({ isOpen, onClose, onApply }) => {
  const [naturalLanguage, setNaturalLanguage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedRule, setGeneratedRule] = useState<Omit<FormattingRule, 'range'> | null>(null);
  const [error, setError] = useState('');

  const handleGenerateRule = async () => {
    if (!naturalLanguage) return;
    setIsLoading(true);
    setError('');
    setGeneratedRule(null);
    try {
        const rule = await generateFormattingRule(naturalLanguage);
        if (rule) {
            setGeneratedRule(rule);
        } else {
            setError("AI could not generate a rule from your text. Please be more specific.");
        }
    } catch (e) {
        setError("An error occurred while generating the rule.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (generatedRule) {
      onApply(generatedRule);
      handleClose();
    }
  };
  
  const handleClose = () => {
      setNaturalLanguage('');
      setGeneratedRule(null);
      setError('');
      setIsLoading(false);
      onClose();
  }

  return (
    <SpreadsheetModal isOpen={isOpen} onClose={handleClose} title="Conditional Formatting with AI">
        <div className="flex flex-col h-full">
            <div className="flex-grow space-y-4">
                <p className="text-sm text-gray-400">Describe the formatting you want to apply to the selected cells.</p>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                
                <div className="space-y-2">
                    <textarea 
                        value={naturalLanguage}
                        onChange={(e) => setNaturalLanguage(e.target.value)}
                        placeholder="e.g., 'highlight cells with values greater than 500 in light green' or 'make text red for cells that contain the word urgent'"
                        className="modal-input h-24"
                    />
                     <button onClick={handleGenerateRule} disabled={isLoading || !naturalLanguage} className="action-btn w-full flex items-center justify-center">
                        {isLoading ? <Spinner /> : "Generate Rule"}
                    </button>
                </div>
                
                {generatedRule && (
                    <div className="p-4 bg-[#2a2a2a] rounded-lg border border-[#333] space-y-2 animate-fade-in">
                        <h3 className="font-semibold text-lg text-[#E0E0E0]">AI Generated Rule:</h3>
                        <p className="text-gray-300">
                            The AI will apply the following style: 
                            <span className="inline-block px-2 py-1 rounded ml-2" style={{ backgroundColor: generatedRule.style.backgroundColor, color: generatedRule.style.color || '#E0E0E0' }}>
                                Styled Text
                            </span>
                        </p>
                        <p className="text-sm text-gray-400">
                            Condition: {generatedRule.type.replace('_', ' ')} {generatedRule.value1} {generatedRule.value2 ? `and ${generatedRule.value2}` : ''}
                        </p>
                    </div>
                )}
            </div>
            <footer className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t border-[#333]">
                <button onClick={handleClose} className="cancel-btn">Cancel</button>
                <button onClick={handleApply} disabled={!generatedRule} className="action-btn">Apply to Selection</button>
            </footer>
        </div>
    </SpreadsheetModal>
  );
};

export default ConditionalFormattingModal;
