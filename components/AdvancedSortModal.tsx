import React, { useState } from 'react';
import type { MultiSortConfig } from '../types';
import SpreadsheetModal from './SpreadsheetModal';

interface AdvancedSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (criteria: MultiSortConfig[]) => void;
  headers: string[];
}

const AdvancedSortModal: React.FC<AdvancedSortModalProps> = ({ isOpen, onClose, onApply, headers }) => {
  const [criteria, setCriteria] = useState<MultiSortConfig[]>([{ column: headers[0] || '', order: 'ASC' }]);

  const handleApply = () => {
    onApply(criteria.filter(c => c.column));
    onClose();
  };

  const updateCriterion = (index: number, key: keyof MultiSortConfig, value: string) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], [key]: value };
    setCriteria(newCriteria);
  };

  const addCriterion = () => {
    setCriteria([...criteria, { column: headers[0] || '', order: 'ASC' }]);
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  return (
    <SpreadsheetModal isOpen={isOpen} onClose={onClose} title="Advanced Sort">
        <div className="flex flex-col h-full">
            <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                <p className="text-sm text-gray-400">Sort by multiple columns. Criteria are applied in order.</p>
                <div className="space-y-3">
                    {criteria.map((criterion, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-[#2A2A2A] rounded-md">
                            <span className="text-gray-400">{index === 0 ? 'Sort by' : 'Then by'}</span>
                            <select
                                value={criterion.column}
                                onChange={(e) => updateCriterion(index, 'column', e.target.value)}
                                className="modal-input flex-grow"
                            >
                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <select
                                value={criterion.order}
                                onChange={(e) => updateCriterion(index, 'order', e.target.value)}
                                className="modal-input"
                            >
                                <option value="ASC">A to Z</option>
                                <option value="DESC">Z to A</option>
                            </select>
                            <button onClick={() => removeCriterion(index)} className="p-1 text-gray-400 hover:text-red-500 rounded-full" title="Remove level">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
                 <button onClick={addCriterion} className="toolbar-btn text-sm">+ Add a level</button>
            </div>
            <footer className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t border-[#333]">
                <button onClick={onClose} className="cancel-btn">Cancel</button>
                <button onClick={handleApply} className="action-btn">Apply Sort</button>
            </footer>
        </div>
    </SpreadsheetModal>
  );
};
export default AdvancedSortModal;
