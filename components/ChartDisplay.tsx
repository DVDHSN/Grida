import React, { useRef, useEffect, useState } from 'react';
import type { Chart, ChartTemplate } from '../types';
import Spinner from './Spinner';

interface ChartDisplayProps {
  chart: Chart;
  templates: ChartTemplate[];
  onSaveTemplate: (name: string, options: any) => void;
}

const COLORS = ['#800020', '#A34D5D', '#C7999E', '#EBCFD2', '#60233D', '#3A1525'];
const COLORS_BG_TRANSPARENT = ['rgba(128, 0, 32, 0.6)', 'rgba(163, 77, 93, 0.6)', 'rgba(199, 153, 158, 0.6)', 'rgba(235, 207, 210, 0.6)', 'rgba(96, 35, 61, 0.6)', 'rgba(58, 21, 37, 0.6)'];


const ChartDisplay: React.FC<ChartDisplayProps> = ({ chart, templates, onSaveTemplate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null); // Chart.js instance
  const [isLibLoaded, setIsLibLoaded] = useState(!!(window as any).Chart);
  const [appliedTemplate, setAppliedTemplate] = useState<any | null>(chart.templateOptions || null);

  // Effect to handle the deferred loading of the Chart.js library
  useEffect(() => {
    if (isLibLoaded) return;
    const interval = setInterval(() => {
      if ((window as any).Chart) {
        setIsLibLoaded(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isLibLoaded]);

  // Effect to create, update, and destroy the chart
  useEffect(() => {
    if (!isLibLoaded || !canvasRef.current || !chart || !chart.data || chart.data.length === 0) {
      return;
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ChartJs = (window as any).Chart;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    ChartJs.defaults.color = '#888888';
    ChartJs.defaults.font.family = "'Inter', sans-serif";

    const labelKey = Object.keys(chart.data[0])[0];
    const labels = chart.data.map(item => item[labelKey]);
    
    let datasets;
    if (chart.type === 'scatter') {
        const xKey = chart.dataKeys[0];
        const yKey = chart.dataKeys[1];
        datasets = [{
            label: labelKey,
            data: chart.data.map(item => ({ x: item[xKey], y: item[yKey] })),
            backgroundColor: COLORS[0],
        }];
    } else {
        datasets = chart.dataKeys.map((key, index) => {
            const datasetType = chart.type === 'combo' ? (chart.datasetTypes?.[key] || 'bar') : chart.type;
            const useSecondaryAxis = chart.secondaryAxisKeys?.includes(key);

            return {
                type: datasetType,
                label: key,
                data: chart.data.map(item => item[key]),
                backgroundColor: chart.type === 'pie' ? COLORS : (datasetType === 'area' || datasetType === 'bar' ? COLORS_BG_TRANSPARENT[index % COLORS_BG_TRANSPARENT.length] : 'transparent'),
                borderColor: COLORS[index % COLORS.length],
                borderWidth: chart.type === 'pie' ? 1 : 2,
                fill: datasetType === 'area',
                pointBackgroundColor: COLORS[index % COLORS.length],
                pointRadius: datasetType === 'line' ? 3 : undefined,
                pointHoverRadius: datasetType === 'line' ? 5 : undefined,
                yAxisID: useSecondaryAxis ? 'y1' : 'y',
            };
        });
    }

    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
          legend: { position: 'top' as const, labels: { color: '#E0E0E0' } },
          tooltip: {
            backgroundColor: '#2A2A2A',
            titleColor: '#E0E0E0',
            bodyColor: '#E0E0E0',
            borderColor: '#333333',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 4,
          }
        },
        scales: {
          x: { grid: { color: '#333333' }, ticks: { color: '#888888' } },
          y: { 
              grid: { color: '#333333' }, 
              ticks: { color: '#888888' }, 
              beginAtZero: true,
              type: 'linear',
              position: 'left',
          },
          ...(chart.secondaryAxisKeys && chart.secondaryAxisKeys.length > 0 && {
              y1: {
                  grid: { drawOnChartArea: false }, // only draw grid for first Y axis
                  ticks: { color: '#888888' },
                  beginAtZero: true,
                  type: 'linear',
                  position: 'right',
              }
          })
        }
    };

    const deepMerge = (target: any, source: any) => {
        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], deepMerge(target[key], source[key]));
            }
        }
        Object.assign(target || {}, source);
        return target;
    };
    
    const finalOptions = appliedTemplate ? deepMerge(JSON.parse(JSON.stringify(baseOptions)), appliedTemplate) : baseOptions;
    
    const chartConfig: any = {
      type: chart.type === 'combo' ? 'bar' : chart.type, // Default type for combo
      data: { labels, datasets },
      options: finalOptions,
    };

    if (chart.type === 'pie' || chart.type === 'radar') {
        delete chartConfig.options.scales;
        if (chart.type === 'radar') {
            chartConfig.options.scales = {
                r: {
                    angleLines: { color: '#333333' }, grid: { color: '#333333' },
                    pointLabels: { color: '#E0E0E0', font: { size: 12 } },
                    ticks: { color: '#888888', backdropColor: 'transparent' }
                }
            };
        }
    }
    
    chartInstanceRef.current = new ChartJs(ctx, chartConfig);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };

  }, [chart, isLibLoaded, appliedTemplate]);

  const handleDownloadPNG = () => {
    if (canvasRef.current) {
        const link = document.createElement('a');
        link.download = `grida-chart-${chart.type}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
    }
  };

  const handleSaveTemplate = () => {
    const name = window.prompt("Enter a name for this chart template:");
    if (name && chartInstanceRef.current) {
        onSaveTemplate(name, chartInstanceRef.current.options);
    }
  };

  if (!chart || !chart.data || chart.data.length === 0) {
    return null;
  }

  if (!isLibLoaded) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-80 bg-[#1E1E1E] p-4 rounded-lg shadow-inner">
        <Spinner />
        <p className="text-gray-400 mt-2">Loading chart library...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-end gap-2 p-2 border-b border-[#333]">
             <select 
                onChange={(e) => {
                    const template = templates.find(t => t.name === e.target.value);
                    setAppliedTemplate(template ? template.options : null);
                }}
                className="bg-[#2a2a2a] border border-[#444] rounded-md text-xs text-gray-300 p-1.5"
                defaultValue=""
             >
                <option value="">Default Style</option>
                {templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
             </select>
             <button
                onClick={handleSaveTemplate}
                className="p-1.5 bg-[#2a2a2a] border border-[#444] rounded-md text-gray-300 text-xs hover:bg-[#333]"
                title="Save current style as template"
            >
                Save Template
            </button>
            <button
                onClick={handleDownloadPNG}
                className="p-1.5 bg-[#2a2a2a] border border-[#444] rounded-md text-gray-300 hover:bg-[#333]"
                title="Download as PNG"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>
        </div>
      <div className="w-full flex-grow p-4">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
};

export default ChartDisplay;