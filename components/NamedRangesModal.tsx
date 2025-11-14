import React, { useState } from 'react';
import type { NamedRange } from '../types';
import Spinner from './Spinner';
import SpreadsheetModal from './SpreadsheetModal';

interface NamedRangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  namedRanges: NamedRange[];
  setNamedRanges: React.Dispatch<React.SetStateAction<NamedRange[]>>;
  onSuggest: () => Promise<string>;
}

const NamedRangesModal: React.FC<NamedRangesModalProps> = ({ isOpen, onClose, namedRanges, setNamedRanges, onSuggest }) => {
    const [name, setName] = useState('');
    const [range, setRange] = useState('');
    const [isDynamic, setIsDynamic] = useState(false);
    const [error, setError] = useState('');
    const [isSuggesting, setIsSuggesting] = useState(false);

    const parseRange = (rangeStr: string): { minRow: number; maxRow: number; minCol: number; maxCol: number } | null => {
        const match = rangeStr.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
        if (!match) return null;
        
        const [, startColStr, startRowStr, endColStr, endRowStr] = match;

        const colStrToNum = (str: string) => str.toUpperCase().split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 'A'.charCodeAt(0) + 1, 0) - 1;

        const startCol = colStrToNum(startColStr);
        const endCol = colStrToNum(endColStr);
        const startRow = parseInt(startRowStr, 10) - 1;
        const endRow = parseInt(endRowStr, 10) - 1;

        if (isNaN(startCol) || isNaN(endCol) || isNaN(startRow) || isNaN(endRow) || startRow < 0 || startCol < 0) {
            return null;
        }

        return {
            minRow: Math.min(startRow, endRow),
            maxRow: Math.max(startRow, endRow),
            minCol: Math.min(startCol, endCol),
            maxCol: Math.max(startCol, endCol),
        };
    };

    const handleAddRange = () => {
        setError('');
        if (!name.trim() || !range.trim()) {
            setError('Name and range cannot be empty.');
            return;
        }
        if (namedRanges.some(nr => nr.name.toLowerCase() === name.trim().toLowerCase())) {
            setError('This name is already in use.');
            return;
        }
        const parsedRange = parseRange(range);
        if (!parsedRange) {
            setError("Invalid range format. Use format like 'A1:C10'.");
            return;
        }
        
        setNamedRanges(prev => [...prev, { name: name.trim(), range: parsedRange, isDynamic }]);
        setName('');
        setRange('');
        setIsDynamic(false);
    };

    const handleRemoveRange = (nameToRemove: string) => {
        setNamedRanges(prev => prev.filter(nr => nr.name !== nameToRemove));
    };

    const rangeToString = (r: NamedRange['range']) => {
        const colNumToStr = (num: number): string => {
            let str = '';
            let t;
            while (num >= 0) {
                t = num % 26;
                str = String.fromCharCode(t + 65) + str;
                num = Math.floor(num / 26) - 1;
            }
            return str;
        }
        return `${colNumToStr(r.minCol)}${r.minRow+1}:${colNumToStr(r.maxCol)}${r.maxRow+1}`;
    };

    const handleSuggestName = async () => {
        setIsSuggesting(true);
        setError('');
        try {
            const suggestedName = await onSuggest();
            if (suggestedName) {
                setName(suggestedName);
            } else {
                setError("AI couldn't suggest a name. Make sure you have a range selected.");
            }
        } catch (e) {
            setError("Error getting suggestion.");
        } finally {
            setIsSuggesting(false);
        }
    };


    return (
        <SpreadsheetModal isOpen={isOpen} onClose={onClose} title="Named Ranges">
            <div className="flex flex-col h-full">
                <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                    {/* List of existing ranges */}
                    <div className="space-y-2">
                        {namedRanges.length > 0 ? namedRanges.map(nr => (
                            <div key={nr.name} className="flex justify-between items-center bg-[#2A2A2A] p-2 rounded-md">
                                <div>
                                    <p className="font-semibold">{nr.name} {nr.isDynamic && <span className="text-xs text-green-400">(Dynamic)</span>}</p>
                                    <p className="text-xs text-gray-400">{rangeToString(nr.range)}</p>
                                </div>
                                <button onClick={() => handleRemoveRange(nr.name)} className="text-gray-400 hover:text-red-500 p-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        )) : <p className="text-center text-gray-500">No named ranges yet.</p>}
                    </div>

                    <div className="border-t border-[#333] pt-4">
                        <h3 className="text-lg font-lora mb-2">Add New Range</h3>
                        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex">
                                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="modal-input rounded-r-none flex-grow" />
                                <button onClick={handleSuggestName} disabled={isSuggesting} className="bg-[#3A3A3A] text-white px-3 rounded-r-md border border-l-0 border-[#333] hover:bg-[#4A4A4A] flex items-center" title="Suggest name with AI">
                                    {isSuggesting ? <Spinner /> : 
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                    }
                                </button>
                           </div>
                           <input type="text" value={range} onChange={e => setRange(e.target.value)} placeholder="Range (e.g., A1:C10)" className="modal-input" />
                        </div>
                        <div className="flex items-center mt-3">
                            <input id="isDynamic" type="checkbox" checked={isDynamic} onChange={e => setIsDynamic(e.target.checked)} className="h-4 w-4 rounded border-gray-500 bg-[#2A2A2A] text-[#800020] focus:ring-[#800020]"/>
                            <label htmlFor="isDynamic" className="ml-2 block text-sm text-gray-300">Dynamic Range (auto-expands with data)</label>
                        </div>
                    </div>
                </div>
                <footer className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t border-[#333]">
                    <button onClick={onClose} className="cancel-btn">Close</button>
                    <button onClick={handleAddRange} className="action-btn">Add Range</button>
                </footer>
            </div>
        </SpreadsheetModal>
    );
};

export default NamedRangesModal;
