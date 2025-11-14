import React, { useState, useEffect, useRef } from 'react';
import SpreadsheetModal from './SpreadsheetModal';
import Spinner from './Spinner';
import { getForecast } from '../services/geminiService';
import type { ForecastResponse } from '../services/geminiService';

interface ForecastingModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, any>[];
  headers: string[];
}

const ForecastingModal: React.FC<ForecastingModalProps> = ({ isOpen, onClose, data, headers }) => {
    const [timeColumn, setTimeColumn] = useState(headers[0] || '');
    const [valueColumn, setValueColumn] = useState(headers.length > 1 ? headers[1] : '');
    const [periods, setPeriods] = useState(12);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ForecastResponse | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<any>(null);
    
    useEffect(() => {
        // Reset state when modal opens
        if (isOpen) {
            setError(null);
            setResult(null);
            setTimeColumn(headers[0] || '');
            setValueColumn(headers.length > 1 ? headers[1] : '');
        }
    }, [isOpen, headers]);

    const handleGenerate = async () => {
        if (!timeColumn || !valueColumn) {
            setError("Please select both a time and a value column.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const response = await getForecast(data, timeColumn, valueColumn, periods);
            setResult(response);
        } catch (e: any) {
            setError(e.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!result || !canvasRef.current) return;
        
        const ChartJs = (window as any).Chart;
        if (!ChartJs) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const historicalData = data.map(row => ({ time: row[timeColumn], value: row[valueColumn] }));
        const forecastData = result.forecastData;

        const allLabels = [...historicalData.map(d => d.time), ...forecastData.map(d => d.time)];
        const historicalValues = historicalData.map(d => d.value);
        // Create an array with nulls for the historical part and values for the forecast part
        const forecastValues = [...Array(historicalData.length).fill(null), ...forecastData.map(d => d.value)];
        
        ChartJs.defaults.color = '#888888';
        ChartJs.defaults.font.family = "'Inter', sans-serif";

        chartInstanceRef.current = new ChartJs(canvasRef.current.getContext('2d'), {
            type: 'line',
            data: {
                labels: allLabels,
                datasets: [
                    {
                        label: `Historical ${valueColumn}`,
                        data: historicalValues,
                        borderColor: '#A34D5D',
                        backgroundColor: 'rgba(163, 77, 93, 0.2)',
                        fill: false,
                        tension: 0.1,
                    },
                    {
                        label: `Forecasted ${valueColumn}`,
                        data: forecastValues,
                        borderColor: '#EBCFD2',
                        backgroundColor: 'rgba(235, 207, 210, 0.2)',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.1,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { grid: { color: '#333333' }, ticks: { color: '#888888' } },
                  y: { grid: { color: '#333333' }, ticks: { color: '#888888' }, beginAtZero: true },
                },
                plugins: {
                  legend: { position: 'top', labels: { color: '#E0E0E0' } },
                }
            }
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };

    }, [result, data, timeColumn, valueColumn]);

    return (
        <SpreadsheetModal isOpen={isOpen} onClose={onClose} title="Predictive Forecasting">
            <div className="flex flex-col h-full">
                <div className="flex-grow flex h-full overflow-hidden">
                    {/* Config Panel */}
                    <div className="w-1/3 border-r border-[#333] p-4 flex flex-col space-y-4 overflow-y-auto">
                        <h3 className="text-lg font-lora">Configuration</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Time/Date Column</label>
                            <select value={timeColumn} onChange={e => setTimeColumn(e.target.value)} className="modal-input">
                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Value Column</label>
                            <select value={valueColumn} onChange={e => setValueColumn(e.target.value)} className="modal-input">
                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Periods to Forecast</label>
                            <input type="number" value={periods} onChange={e => setPeriods(parseInt(e.target.value, 10) || 1)} min="1" className="modal-input" />
                        </div>
                        <button onClick={handleGenerate} disabled={isLoading} className="action-btn flex justify-center w-full">
                            {isLoading ? <Spinner /> : "Generate Forecast"}
                        </button>
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                    </div>
                    {/* Preview Panel */}
                    <div className="w-2/3 p-4 flex flex-col">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Spinner />
                                <span className="ml-2 text-gray-300">AI is generating your forecast...</span>
                            </div>
                        ) : result ? (
                            <div className="flex flex-col h-full space-y-4">
                                <div className="flex-grow h-2/3">
                                    <canvas ref={canvasRef}></canvas>
                                </div>
                                <div className="flex-shrink-0 p-3 bg-[#121212] rounded-md border border-[#333] max-h-1/3 overflow-y-auto">
                                    <h4 className="font-semibold text-gray-200">AI Explanation</h4>
                                    <p className="text-sm text-gray-400 mt-1">{result.explanation}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                <p>Configure and generate a forecast to see the results.</p>
                            </div>
                        )}
                    </div>
                </div>
                 <footer className="flex-shrink-0 flex justify-end p-4 border-t border-[#333]">
                    <button onClick={onClose} className="cancel-btn">Close</button>
                </footer>
            </div>
        </SpreadsheetModal>
    );
};

export default ForecastingModal;
