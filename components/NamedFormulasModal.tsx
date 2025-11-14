import React, { useState } from 'react';
import type { NamedFormula } from '../types';
import SpreadsheetModal from './SpreadsheetModal';

interface NamedFormulasModalProps {
  isOpen: boolean;
  onClose: () => void;
  namedFormulas: NamedFormula[];
  onSave: (formula: NamedFormula) => void;
  onDelete: (name: string) => void;
}

const NamedFormulasModal: React.FC<NamedFormulasModalProps> = ({ isOpen, onClose, namedFormulas, onSave, onDelete }) => {
    const [name, setName] = useState('');
    const [formula, setFormula] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');

    const handleSave = () => {
        setError('');
        if (!name.trim() || !formula.trim()) {
            setError('Name and formula cannot be empty.');
            return;
        }
        if (namedFormulas.some(nf => nf.name.toLowerCase() === name.trim().toLowerCase())) {
            setError('This name is already in use.');
            return;
        }

        onSave({ name: name.trim(), formula, description });
        setName('');
        setFormula('');
        setDescription('');
    };

    return (
        <SpreadsheetModal isOpen={isOpen} onClose={onClose} title="Named Formulas">
            <div className="flex flex-col h-full">
                <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                    <div className="space-y-2">
                        {namedFormulas.length > 0 ? namedFormulas.map(nf => (
                            <div key={nf.name} className="flex justify-between items-start bg-[#2A2A2A] p-3 rounded-md">
                                <div>
                                    <p className="font-semibold text-white">{nf.name}</p>
                                    <code className="text-sm text-gray-300 bg-[#121212] p-1 rounded-sm">{nf.formula}</code>
                                    {nf.description && <p className="text-xs text-gray-400 mt-1 italic">{nf.description}</p>}
                                </div>
                                <button onClick={() => onDelete(nf.name)} className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        )) : <p className="text-center text-gray-500">No named formulas have been saved.</p>}
                    </div>
                    <div className="border-t border-[#333] pt-4">
                        <h3 className="text-lg font-lora mb-2">Add New Formula</h3>
                        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
                        <div className="space-y-3">
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Formula Name (e.g., 'calculate_profit')" className="modal-input" />
                            <input type="text" value={formula} onChange={e => setFormula(e.target.value)} placeholder="Formula (e.g., '=Sales - Cost')" className="modal-input" />
                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" className="modal-input h-20" />
                        </div>
                    </div>
                </div>
                <footer className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t border-[#333]">
                    <button onClick={onClose} className="cancel-btn">Close</button>
                    <button onClick={handleSave} className="action-btn">Save Formula</button>
                </footer>
            </div>
        </SpreadsheetModal>
    );
};
export default NamedFormulasModal;
