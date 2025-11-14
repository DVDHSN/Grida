import React, { useState, useEffect, useMemo } from 'react';
import type { PivotTableConfig } from '../types';
import SpreadsheetModal from './SpreadsheetModal';
import { generatePivotConfig } from '../services/geminiService';
import Spinner from './Spinner';

interface PivotTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, any>[];
  headers: string[];
  initialConfig?: PivotTableConfig | null;
}

// Simple pivot table logic
const generatePivotData = (data: Record<string, any>[], config: PivotTableConfig): Record<string, any>[] => {
    if (!config.rows.length || !config.values.field) return [];

    const aggregationMap = new Map<string, { sum: number; count: number; values: number[] }>();

    data.forEach(row => {
        const rowKey = config.rows.map(r => row[r]).join(' | ');
        const value = parseFloat(row[config.values.field]);
        if (isNaN(value)) return;
        
        if (!aggregationMap.has(rowKey)) {
            aggregationMap.set(rowKey, { sum: 0, count: 0, values: [] });
        }
        const current = aggregationMap.get(rowKey)!;
        current.sum += value;
        current.count++;
        current.values.push(value);
    });

    const result: Record<string, any>[] = [];
    aggregationMap.forEach((agg, key) => {
        const row: Record<string, any> = {};
        const keyParts = key.split(' | ');
        config.rows.forEach((r, i) => { row[r] = keyParts[i]; });
        
        let aggregatedValue: number;
        switch(config.values.aggregate) {
            case 'SUM': aggregatedValue = agg.sum; break;
            case 'COUNT': aggregatedValue = agg.count; break;

            case 'AVERAGE': aggregatedValue = agg.sum / agg.count; break;
            case 'MIN': aggregatedValue = Math.min(...agg.values); break;
            case 'MAX': aggregatedValue = Math.max(...agg.values); break;
            default: aggregatedValue = 0;
        }
        row[config.values.field] = aggregatedValue;
        result.push(row);
    });
    return result;
}


const PivotTableModal: React.FC<PivotTableModalProps> = ({ isOpen, onClose, data, headers, initialConfig }) => {
    const [rows, setRows] = useState<string[]>(initialConfig?.rows || []);
    const [valuesField, setValuesField] = useState<string>(initialConfig?.values?.field || headers[0]);
    const [valuesAggregate, setValuesAggregate] = useState<PivotTableConfig['values']['aggregate']>(initialConfig?.values?.aggregate || 'SUM');
    const [naturalLanguage, setNaturalLanguage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copyStatus, setCopyStatus] = useState('Copy Table');

    useEffect(() => {
        if (initialConfig) {
            setRows(initialConfig.rows || []);
            setValuesField(initialConfig.values?.field || headers[0]);
            setValuesAggregate(initialConfig.values?.aggregate || 'SUM');
        } else if (isOpen) {
            // Reset when opened without initial config
            setRows([]);
            setValuesField(headers[0] || '');
            setValuesAggregate('SUM');
            setNaturalLanguage('');
        }
        setCopyStatus('Copy Table');
    }, [initialConfig, isOpen, headers]);

    const pivotConfig: PivotTableConfig = useMemo(() => ({
        rows,
        values: { field: valuesField, aggregate: valuesAggregate }
    }), [rows, valuesField, valuesAggregate]);

    const pivotData = useMemo(() => generatePivotData(data, pivotConfig), [data, pivotConfig]);
    const pivotHeaders = pivotData.length > 0 ? Object.keys(pivotData[0]) : [];

    const handleGenerateConfig = async () => {
        if (!naturalLanguage) return;
        setIsLoading(true);
        const config = await generatePivotConfig(data, headers, naturalLanguage);
        if (config) {
            setRows(config.rows);
            setValuesField(config.values.field);
            setValuesAggregate(config.values.aggregate);
        } else {
            alert("AI could not generate a configuration. Please try rephrasing.");
        }
        setIsLoading(false);
    };

    const handleToggleRow = (header: string) => {
        setRows(prev => prev.includes(header) ? prev.filter(h => h !== header) : [...prev, header]);
    };
    
    const handleCopyToClipboard = () => {
        if (pivotData.length === 0) return;

        const tsv = [
            pivotHeaders.join('\t'),
            ...pivotData.map(row => pivotHeaders.map(h => row[h]).join('\t'))
        ].join('\n');

        navigator.clipboard.writeText(tsv).then(() => {
            setCopyStatus('Copied!');
            setTimeout(() => setCopyStatus('Copy Table'), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
            alert('Failed to copy table.');
        });
    };

    return (
        <SpreadsheetModal isOpen={isOpen} onClose={onClose} title="Pivot Table">
            <div className="flex flex-col h-full">
                <div className="flex-grow flex h-full overflow-hidden">
                    {/* Config Panel */}
                    <div className="w-1/3 border-r border-[#333] p-4 flex flex-col space-y-4 overflow-y-auto">
                        <h3 className="text-lg font-lora">Configure with AI</h3>
                        <textarea 
                            value={naturalLanguage}
                            onChange={(e) => setNaturalLanguage(e.target.value)}
                            placeholder="e.g., 'show total sales by region'"
                            className="modal-input h-20"
                        />
                        <button onClick={handleGenerateConfig} disabled={isLoading || !naturalLanguage} className="action-btn flex justify-center">
                            {isLoading ? <Spinner /> : "Generate"}
                        </button>
                        <div className="border-t border-[#333] pt-4 space-y-4">
                            <h3 className="text-lg font-lora">Manual Configuration</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Rows</label>
                                <div className="max-h-32 overflow-y-auto bg-[#2A2A2A] p-2 rounded-md border border-[#333] space-y-1">
                                    {headers.map(h => (
                                        <label key={h} className="flex items-center text-sm">
                                            <input type="checkbox" checked={rows.includes(h)} onChange={() => handleToggleRow(h)} className="h-4 w-4 rounded border-gray-500 bg-[#1E1E1E] text-[#800020] focus:ring-[#800020]"/>
                                            <span className="ml-2">{h}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Values</label>
                                <div className="flex gap-2">
                                   <select value={valuesField} onChange={e => setValuesField(e.target.value)} className="modal-input">
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                   </select>
                                   <select value={valuesAggregate} onChange={e => setValuesAggregate(e.target.value as any)} className="modal-input">
                                        <option value="SUM">Sum</option>
                                        <option value="COUNT">Count</option>
                                        <option value="AVERAGE">Average</option>
                                        <option value="MIN">Min</option>
                                        <option value="MAX">Max</option>
                                   </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Preview Panel */}
                    <div className="w-2/3 p-4 overflow-auto">
                         {pivotData.length > 0 ? (
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr>{pivotHeaders.map(h => <th key={h} className="p-2 bg-[#333] border-b border-[#444] font-semibold sticky top-0">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {pivotData.map((row, i) => (
                                        <tr key={i} className="border-b border-[#333] hover:bg-[#2A2A2A]">
                                            {pivotHeaders.map(h => <td key={h} className="p-2">{typeof row[h] === 'number' ? row[h].toLocaleString(undefined, {maximumFractionDigits: 2}) : row[h]}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                <p>Configure the pivot table to see a preview.</p>
                            </div>
                        )}
                    </div>
                </div>
                 <footer className="flex-shrink-0 flex justify-between items-center p-4 border-t border-[#333]">
                    <button
                        onClick={handleCopyToClipboard}
                        disabled={pivotData.length === 0}
                        className="secondary-btn flex items-center gap-2"
                        title="Copy table as tab-separated values"
                    >
                        {copyStatus === 'Copied!' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        )}
                        <span>{copyStatus}</span>
                    </button>
                    <button onClick={onClose} className="cancel-btn">Close</button>
                </footer>
            </div>
        </SpreadsheetModal>
    );
};

export default PivotTableModal;
