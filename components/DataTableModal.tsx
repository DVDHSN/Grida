import React, { useState } from 'react';
import type { WhatIfDataTable } from '../types';
import SpreadsheetModal from './SpreadsheetModal';

interface DataTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: WhatIfDataTable) => void;
  headers: string[];
}

const DataTableModal: React.FC<DataTableModalProps> = ({ isOpen, onClose, onGenerate, headers }) => {
    const [formulaCell, setFormulaCell] = useState(''); // e.g., A1
    const [rowInputHeader, setRowInputHeader] = useState(headers[0] || '');
    const [rowInputValues, setRowInputValues] = useState(''); // comma-separated
    const [colInputHeader, setColInputHeader] = useState('');
    const [colInputValues, setColInputValues] = useState('');
    const [error, setError] = useState('');

    const parseCell = (cellStr: string): {row: number, col: number} | null => {
        const match = cellStr.match(/^([A-Z]+)(\d+)$/i);
        if (!match) return null;
        const [, colStr, rowStr] = match;
        const col = colStr.toUpperCase().split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 'A'.charCodeAt(0) + 1, 0) - 1;
        const row = parseInt(rowStr, 10) - 1;
        if (isNaN(col) || isNaN(row) || row < 0 || col < 0) return null;
        return { row, col };
    }

    const handleGenerate = () => {
        setError('');
        const parsedFormulaCell = parseCell(formulaCell);
        if (!parsedFormulaCell) {
            setError("Invalid Formula Cell format. Use 'A1' style.");
            return;
        }

        const rowVals = rowInputValues.split(',').map(v => {
            const num = parseFloat(v.trim());
            return isNaN(num) ? v.trim() : num;
        }).filter(v => v !== '');

        if (!rowInputHeader || rowVals.length === 0) {
            setError("Row Input Header and a list of values are required.");
            return;
        }

        const colVals = colInputValues.split(',').map(v => {
            const num = parseFloat(v.trim());
            return isNaN(num) ? v.trim() : num;
        }).filter(v => v !== '');

        const config: WhatIfDataTable = {
            formulaCell: parsedFormulaCell,
            rowInput: { header: rowInputHeader, values: rowVals },
            ...(colInputHeader && colVals.length > 0 && {
                colInput: { header: colInputHeader, values: colVals }
            })
        };
        
        onGenerate(config);
    };

    return (
        <SpreadsheetModal isOpen={isOpen} onClose={onClose} title="Data Table (What-If Analysis)">
            <div className="flex flex-col h-full">
                <div className="flex-grow space-y-4">
                     <p className="text-sm text-gray-400">See how changing one or two variables affects your formula's output.</p>
                     {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Formula Cell</label>
                            <input type="text" value={formulaCell} onChange={e => setFormulaCell(e.target.value)} placeholder="Cell with the formula to test (e.g., C5)" className="modal-input"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Row Input</label>
                            <div className="flex gap-2">
                               <select value={rowInputHeader} onChange={e => setRowInputHeader(e.target.value)} className="modal-input w-1/3">
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                               </select>
                               <input type="text" value={rowInputValues} onChange={e => setRowInputValues(e.target.value)} placeholder="Comma-separated values (e.g., 10, 20, 30)" className="modal-input w-2/3"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Column Input (Optional)</label>
                             <div className="flex gap-2">
                               <select value={colInputHeader} onChange={e => setColInputHeader(e.target.value)} className="modal-input w-1/3">
                                   <option value="">None</option>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                               </select>
                               <input type="text" value={colInputValues} onChange={e => setColInputValues(e.target.value)} placeholder="Comma-separated values (e.g., 0.1, 0.15)" className="modal-input w-2/3"/>
                            </div>
                        </div>
                    </div>
                </div>
                 <footer className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t border-[#333]">
                    <button onClick={onClose} className="cancel-btn">Cancel</button>
                    <button onClick={handleGenerate} className="action-btn">Generate Table</button>
                </footer>
            </div>
        </SpreadsheetModal>
    );
};
export default DataTableModal;
