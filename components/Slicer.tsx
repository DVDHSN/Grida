import React, { useState } from 'react';

interface SlicerProps {
    column: string;
    uniqueValues: (string | number)[];
    activeFilters: Set<string | number>;
    onFilterChange: (column: string, value: string | number) => void;
    onClear: (column: string) => void;
}

const Slicer: React.FC<SlicerProps> = ({ column, uniqueValues, activeFilters, onFilterChange, onClear }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredValues = uniqueValues.filter(v => 
        String(v).toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const allSelected = activeFilters.size === 0 || activeFilters.size === uniqueValues.length;

    return (
        <div className="bg-[#2a2a2a] border border-[#333] rounded-lg p-2 shadow-lg w-48 flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm text-gray-200 truncate pr-2">{column}</h4>
                <button 
                    onClick={() => onClear(column)} 
                    className="text-gray-400 hover:text-white disabled:opacity-50 transition-transform transform hover:rotate-90"
                    disabled={allSelected}
                    title="Clear filters"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                </button>
            </div>
            <input 
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#1E1E1E] border border-[#333333] text-xs rounded-md px-2 py-1 mb-2 text-gray-300 focus:ring-1 focus:ring-[#800020] focus:border-[#800020]"
            />
            <div className="flex-grow max-h-48 overflow-y-auto space-y-1 pr-1">
                {filteredValues.map(value => (
                    <label key={String(value)} className="flex items-center text-xs text-gray-300 cursor-pointer hover:bg-[#333] p-1 rounded-sm transition-colors">
                        <input
                            type="checkbox"
                            checked={!activeFilters.has(value)}
                            onChange={() => onFilterChange(column, value)}
                            className="h-3 w-3 rounded-sm border-gray-500 bg-[#1e1e1e] text-[#800020] focus:ring-0 focus:ring-offset-0"
                        />
                        <span className="ml-2 truncate" title={String(value)}>{String(value)}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

export default Slicer;