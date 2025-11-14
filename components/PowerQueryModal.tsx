import React, { useState } from 'react';
import SpreadsheetModal from './SpreadsheetModal';
import { transformData } from '../services/geminiService';
import Spinner from './Spinner';
import type { TransformedDataResponse } from '../types';

interface PowerQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (newData: Record<string, any>[]) => void;
  data: Record<string, any>[];
}

const PowerQueryModal: React.FC<PowerQueryModalProps> = ({ isOpen, onClose, onApply, data }) => {
    const [instructions, setInstructions] = useState('');
    const [secondaryData, setSecondaryData] = useState('');
    const [result, setResult] = useState<TransformedDataResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTransform = async () => {
        if (!instructions) return;
        setIsLoading(true);
        setError('');
        setResult(null);
        try {
            const res = await transformData(data, instructions, secondaryData);
            setResult(res);
        } catch (e: any) {
            setError(e.message || "An error occurred during transformation.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleApply = () => {
        if (result) {
            const newData = result.rows.map(row => {
                const obj: Record<string, any> = {};
                result.headers.forEach((h, i) => { obj[h] = row[i]; });
                return obj;
            });
            onApply(newData);
            onClose();
        }
    };
    
    const handleClose = () => {
        setInstructions('');
        setSecondaryData('');
        setResult(null);
        setError('');
        setIsLoading(false);
        onClose();
    };

    return (
        <SpreadsheetModal isOpen={isOpen} onClose={handleClose} title="Data Transformation (Power Query)">
            <div className="flex flex-col h-full">
                <div className="flex-grow flex h-full overflow-hidden">
                    {/* Config Panel */}
                    <div className="w-1/3 border-r border-[#333] p-4 flex flex-col space-y-4 overflow-y-auto">
                        <div>
                            <h3 className="text-lg font-lora">Instructions</h3>
                            <p className="text-xs text-gray-400">Describe how you want to clean, reshape, or combine your data. Be as specific as possible.</p>
                            <textarea 
                                value={instructions}
                                onChange={e => setInstructions(e.target.value)}
                                placeholder="e.g., 'Split the Full Name column into First Name and Last Name. Then, filter for rows where Region is North.'"
                                className="modal-input h-48 mt-2"
                            />
                        </div>
                        
                         <div>
                             <h3 className="text-lg font-lora">Combine Data (Optional)</h3>
                             <p className="text-xs text-gray-400">Paste another dataset (e.g., CSV format) here to merge or join with your current sheet.</p>
                             <textarea 
                                value={secondaryData}
                                onChange={e => setSecondaryData(e.target.value)}
                                placeholder="Paste secondary data here for lookups or merges..."
                                className="modal-input h-24 mt-2"
                            />
                        </div>
                        
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                    </div>
                    {/* Preview Panel */}
                    <div className="w-2/3 p-4 flex flex-col">
                        <div className="flex-shrink-0 mb-4">
                            <button onClick={handleTransform} disabled={isLoading || !instructions} className="action-btn w-full flex justify-center">
                                {isLoading ? <Spinner /> : "Preview Transformation"}
                            </button>
                        </div>
                         <div className="flex-grow overflow-auto border border-[#333] rounded-md">
                            {result ? (
                                <>
                                    <p className="p-2 bg-[#2a2a2a] border-b border-[#333] text-sm text-gray-300 italic sticky top-0">{result.summary}</p>
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr>{result.headers.map(h => <th key={h} className="p-2 bg-[#333] border-b border-[#444] font-semibold sticky top-0">{h}</th>)}</tr>
                                        </thead>
                                        <tbody>
                                            {result.rows.map((row, i) => (
                                                <tr key={i} className="border-b border-[#333] hover:bg-[#2A2A2A]">
                                                    {row.map((cell, j) => <td key={j} className="p-2 whitespace-nowrap overflow-hidden text-ellipsis">{String(cell)}</td>)}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <p>Enter instructions and click 'Preview'.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                 <footer className="flex-shrink-0 flex justify-end gap-2 p-4 border-t border-[#333]">
                    <button onClick={handleClose} className="cancel-btn">Cancel</button>
                    <button onClick={handleApply} disabled={!result} className="action-btn">Apply to Sheet</button>
                </footer>
            </div>
        </SpreadsheetModal>
    );
};

export default PowerQueryModal;
