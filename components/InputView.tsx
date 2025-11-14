import React, { useState, useRef, useEffect } from 'react';
import Spinner from './Spinner';

interface InputViewProps {
  rawText: string;
  setRawText: (text: string) => void;
  initialContext: string;
  setInitialContext: (text: string) => void;
  onProcessData: () => void;
  onStartEmpty: () => void;
  isLoading: boolean;
  error: string | null;
  onGenerateFromTemplate: (prompt: string) => void;
}

const sampleData = `Date,Product Category,Sales,Region
2023-01-15,Electronics,$1,500,North
2023-01-16,Clothing,$800,South
2023-01-17,Electronics,1200,North
2023-02-05,Books,$300,West
2023-02-06,Clothing,$950,South
2023-02-08,Home Goods,$600,East
2023-03-10,Electronics,$2,200,North
2023-03-12,Books,250,West`;

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`w-1/3 text-center py-2.5 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#800020] focus-visible:ring-opacity-50 ${
            active ? 'bg-[#800020] text-white shadow-md' : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
        }`}
    >
        {children}
    </button>
);

const InputView: React.FC<InputViewProps> = ({ rawText, setRawText, initialContext, setInitialContext, onProcessData, onStartEmpty, isLoading, error, onGenerateFromTemplate }) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'template' | 'empty'>('paste');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [templatePrompt, setTemplatePrompt] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDragging && activeTab !== 'paste') {
        setActiveTab('paste');
    }
  }, [isDragging, activeTab]);

  const handleUseSampleData = () => {
    setRawText(sampleData);
    setActiveTab('paste');
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'xlsx') {
        reader.onload = (e) => {
            try {
                const XLSX = (window as any).XLSX;
                if (!XLSX) {
                    alert("Excel library not loaded yet. Please try again in a moment.");
                    return;
                }
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const csvData = XLSX.utils.sheet_to_csv(worksheet);
                setRawText(csvData);
            } catch (err) {
                console.error("Error parsing XLSX file:", err);
                alert("There was an error parsing the Excel file.");
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        reader.onload = (e) => setRawText(e.target?.result as string);
        reader.readAsText(file);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#E0E0E0] flex flex-col items-center justify-center p-4 antialiased" onDragEnter={handleDragEnter}>
      <div className="w-full max-w-2xl mx-auto text-center">
        <header className="mb-10">
          <h1 className="text-6xl font-lora font-semibold text-white tracking-tight">
            Grida
          </h1>
          <p className="mt-3 text-lg text-gray-400">
            Your data, instantly intelligent.
          </p>
        </header>

        {error && (
            <div className="bg-[#4d0013] border border-[#800020] text-red-200 px-4 py-3 rounded-lg relative mb-6 animate-scale-in" role="alert" style={{animationDuration: '0.3s'}}>
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}
        
        <main className="w-full bg-[#1a1a1a] border border-[#282828] rounded-xl shadow-2xl overflow-hidden animate-fade-in text-left">
            <div className="flex p-1.5 bg-[#121212]">
                <TabButton active={activeTab === 'paste'} onClick={() => setActiveTab('paste')}>Paste Data</TabButton>
                <TabButton active={activeTab === 'template'} onClick={() => setActiveTab('template')}>From Template</TabButton>
                <TabButton active={activeTab === 'empty'} onClick={() => setActiveTab('empty')}>Start Empty</TabButton>
            </div>
            
            <div className="p-8">
                {activeTab === 'paste' && (
                    <div onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className="relative animate-fade-in">
                        {isDragging && (
                          <div className="absolute inset-0 bg-[#1a1a1a] bg-opacity-95 flex flex-col items-center justify-center rounded-lg z-10 pointer-events-none border-2 border-dashed border-[#800020]">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#800020] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 15v4m-3-3l3 3 3-3" /></svg>
                              <p className="text-lg font-semibold text-[#800020]">Drop file to upload</p>
                          </div>
                        )}
                        <textarea
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder="Paste your raw data here (e.g., from a CSV or spreadsheet)"
                            className="w-full h-48 p-3 bg-[#2A2A2A] border border-[#333333] rounded-md focus:ring-2 focus:ring-[#800020] focus:border-[#800020] duration-200 text-[#E0E0E0] placeholder-gray-500"
                        />
                         <div className="mt-4">
                            <button onClick={() => setShowInstructions(!showInstructions)} className="text-sm text-gray-400 hover:text-white">
                                {showInstructions ? '- Hide instructions' : '+ Add special instructions'}
                            </button>
                            {showInstructions && (
                                <textarea
                                    value={initialContext}
                                    onChange={(e) => setInitialContext(e.target.value)}
                                    placeholder="e.g., 'Treat the Sales column as currency.'"
                                    className="w-full h-24 mt-2 p-3 bg-[#2A2A2A] border border-[#333333] rounded-md focus:ring-2 focus:ring-[#800020] focus:border-[#800020] duration-200 text-[#E0E0E0] placeholder-gray-500 animate-fade-in"
                                />
                            )}
                        </div>
                        <input
                            type="file" ref={fileInputRef} onChange={handleFileChange}
                            className="hidden" accept=".csv,.txt,text/plain,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        />
                        <div className="mt-6 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm">
                                <button onClick={handleImportClick} className="text-gray-400 hover:text-white border-b border-dashed border-gray-600 hover:border-white">Import File</button>
                                <button onClick={handleUseSampleData} className="text-gray-400 hover:text-white border-b border-dashed border-gray-600 hover:border-white">Use Sample</button>
                            </div>
                            <button
                                onClick={onProcessData}
                                disabled={isLoading || !rawText.trim()}
                                className="w-48 h-12 flex items-center justify-center bg-[#800020] hover:bg-[#990026] disabled:bg-[#333333] disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transform hover:scale-105"
                            >
                                {isLoading ? <><Spinner /> <span className="ml-2">Analyzing...</span></> : 'Analyze Data'}
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'template' && (
                     <div className="animate-fade-in">
                        <textarea
                            value={templatePrompt}
                            onChange={(e) => setTemplatePrompt(e.target.value)}
                            placeholder="e.g., 'A project management tracker for a new software launch...'"
                            className="w-full h-48 p-3 bg-[#2A2A2A] border border-[#333333] rounded-md focus:ring-2 focus:ring-[#800020] focus:border-[#800020] duration-200 text-[#E0E0E0] placeholder-gray-500"
                        />
                        <div className="mt-6 flex justify-end">
                             <button
                                onClick={() => onGenerateFromTemplate(templatePrompt)}
                                disabled={isLoading || !templatePrompt.trim()}
                                className="w-48 h-12 flex items-center justify-center bg-[#800020] hover:bg-[#990026] disabled:bg-[#333333] disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transform hover:scale-105"
                            >
                                {isLoading ? <><Spinner /> <span className="ml-2">Generating...</span></> : 'Generate Sheet'}
                            </button>
                        </div>
                     </div>
                )}
                 {activeTab === 'empty' && (
                     <div className="animate-fade-in text-center">
                        <h3 className="text-2xl font-lora font-medium text-white">Start with a blank slate</h3>
                        <p className="mt-2 text-gray-400">You'll get a clean grid, ready for your data and ideas.</p>
                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={onStartEmpty}
                                disabled={isLoading}
                                className="w-56 h-12 flex items-center justify-center bg-[#800020] hover:bg-[#990026] disabled:bg-[#333333] disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transform hover:scale-105"
                            >
                               {isLoading ? <Spinner/> : 'Create Blank Sheet'}
                            </button>
                        </div>
                     </div>
                 )}
            </div>
        </main>
      </div>
    </div>
  );
};

export default InputView;
