import React, { useState } from 'react';
import type { Macro, ToolCall } from '../types';
import SpreadsheetModal from './SpreadsheetModal';
import { generateMacroScript } from '../services/geminiService';
import Spinner from './Spinner';

interface MacrosModalProps {
  isOpen: boolean;
  onClose: () => void;
  macros: Macro[];
  onSave: (macro: Macro) => void;
  onApply: (actions: ToolCall[]) => void;
  data: Record<string, any>[];
}

const MacrosModal: React.FC<MacrosModalProps> = ({ isOpen, onClose, macros, onSave, onApply, data }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [instructions, setInstructions] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedActions, setGeneratedActions] = useState<ToolCall[] | null>(null);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!instructions) return;
        setIsLoading(true);
        setError('');
        setGeneratedActions(null);
        try {
            const actions = await generateMacroScript(data, instructions);
            if (actions && actions.length > 0) {
                setGeneratedActions(actions as ToolCall[]);
            } else {
                setError("AI could not generate a macro from your instructions.");
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSave = () => {
        if (!name || !generatedActions) {
            setError("Please provide a name and generate the macro steps first.");
            return;
        }
        onSave({ name, description, actions: generatedActions });
        handleClose();
    };

    const handleClose = () => {
        setName('');
        setDescription('');
        setInstructions('');
        setGeneratedActions(null);
        setError('');
        setIsLoading(false);
        onClose();
    };

    return (
        <SpreadsheetModal isOpen={isOpen} onClose={handleClose} title="Macros">
            <div className="flex flex-col h-full">
                <div className="flex-grow flex h-full overflow-hidden">
                    {/* Saved Macros Panel */}
                    <div className="w-1/3 border-r border-[#333] p-4 flex flex-col space-y-2 overflow-y-auto">
                        <h3 className="text-lg font-lora mb-2 flex-shrink-0">Saved Macros</h3>
                        <div className="flex-grow space-y-2 pr-2">
                        {macros.length > 0 ? macros.map(macro => (
                            <div key={macro.name} className="bg-[#2A2A2A] p-3 rounded-md">
                                <p className="font-semibold text-white">{macro.name}</p>
                                <p className="text-xs text-gray-400 italic mb-2">{macro.description}</p>
                                <button onClick={() => onApply(macro.actions)} className="action-btn text-xs py-1 px-2">Run</button>
                            </div>
                        )) : <p className="text-center text-gray-500 text-sm">No macros saved yet.</p>}
                        </div>
                    </div>
                    {/* Create Macro Panel */}
                    <div className="w-2/3 p-4 flex flex-col space-y-4">
                        <div>
                            <h3 className="text-lg font-lora mb-2">Create New Macro with AI</h3>
                            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
                            <div className="space-y-3">
                                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Macro Name" className="modal-input"/>
                                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" className="modal-input"/>
                                <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Describe the steps to automate... e.g., 'Find all rows where Category is Electronics and delete them. Then sort by Sales descending.'" className="modal-input h-24"/>
                            </div>
                        </div>
                        <button onClick={handleGenerate} disabled={isLoading || !instructions} className="action-btn w-full flex justify-center">
                            {isLoading ? <Spinner/> : 'Generate Macro Steps'}
                        </button>
                        <div className="flex-grow bg-[#121212] border border-[#333] rounded-md p-2 overflow-y-auto">
                            <h4 className="text-md font-lora mb-2 text-gray-300">Generated Steps:</h4>
                            {generatedActions ? (
                                <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                                    {JSON.stringify(generatedActions, null, 2)}
                                </pre>
                            ) : (
                                <p className="text-sm text-gray-500">AI-generated tool calls will appear here.</p>
                            )}
                        </div>
                    </div>
                </div>
                 <footer className="flex-shrink-0 flex justify-end gap-2 p-4 border-t border-[#333]">
                    <button onClick={handleClose} className="cancel-btn">Cancel</button>
                    <button onClick={handleSave} disabled={!generatedActions || !name} className="action-btn">Save Macro</button>
                </footer>
            </div>
        </SpreadsheetModal>
    );
};

export default MacrosModal;
