
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { processRawData, startChatSession, sendMessageToChat, transformData, performConversationalGoalSeek, evaluateNaturalFormula, generateTemplate } from './services/geminiService';
import type { Chart, InitialAnalysisResponse, QueryResponse, ChatMessage, ToolCall, SlicerConfig, MultiSortConfig, ValidationRule, FormattingRule, NamedRange, CustomView, NamedFormula, PivotTableConfig } from './types';
import InputView from './components/InputView';
import AnalysisView from './components/AnalysisView';
import { Chat } from '@google/genai';

// --- Helper Functions ---
const parseRange = (rangeStr: string): { minRow: number; maxRow: number; minCol: number; maxCol: number } | null => {
    const match = rangeStr.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/i);
    if (!match) return null;
    
    const [, startColStr, startRowStr, endColStr, endRowStr] = match;

    const colStrToNum = (str: string) => str.toUpperCase().split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 'A'.charCodeAt(0) + 1, 0) - 1;

    const startCol = colStrToNum(startColStr);
    const startRow = parseInt(startRowStr, 10) - 1;
    
    // Handle single cell ranges (e.g., "A1")
    const endCol = endColStr ? colStrToNum(endColStr) : startCol;
    const endRow = endRowStr ? parseInt(endRowStr, 10) - 1 : startRow;


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

const App: React.FC = () => {
    const [view, setView] = useState<'input' | 'analysis'>('input');
    const [rawText, setRawText] = useState<string>('');
    const [initialContext, setInitialContext] = useState<string>('');
    const [analysis, setAnalysis] = useState<InitialAnalysisResponse | null>(null);
    const [chat, setChat] = useState<Chat | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [slicers, setSlicers] = useState<SlicerConfig[]>([]);
    
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isChatPanelOpen, setIsChatPanelOpen] = useState(() => {
        const savedState = localStorage.getItem('grida-chat-panel-open');
        return savedState ? JSON.parse(savedState) : true;
    });
    
    const cancellationRef = useRef<boolean>(false);

    // --- Lifted State from EditableSpreadsheet ---
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
    const [isConditionalFormattingModalOpen, setIsConditionalFormattingModalOpen] = useState(false);
    const [isPivotTableModalOpen, setIsPivotTableModalOpen] = useState(false);
    const [isPowerQueryModalOpen, setIsPowerQueryModalOpen] = useState(false);
    const [isMacrosModalOpen, setIsMacrosModalOpen] = useState(false);
    const [isNamedRangesModalOpen, setIsNamedRangesModalOpen] = useState(false);
    const [isGoalSeekModalOpen, setIsGoalSeekModalOpen] = useState(false);
    const [isAdvancedSortModalOpen, setIsAdvancedSortModalOpen] = useState(false);
    const [isNamedFormulasModalOpen, setIsNamedFormulasModalOpen] = useState(false);
    const [isCustomViewsModalOpen, setIsCustomViewsModalOpen] = useState(false);
    const [isDataTableModalOpen, setIsDataTableModalOpen] = useState(false);
    // --- New Feature Modals ---
    const [isExplainSheetModalOpen, setIsExplainSheetModalOpen] = useState(false);
    const [isForecastingModalOpen, setIsForecastingModalOpen] = useState(false);


    const [chartData, setChartData] = useState<Chart | null>(null);
    const [validationRules, setValidationRules] = useState<Record<string, ValidationRule>>({});
    const [formattingRules, setFormattingRules] = useState<FormattingRule[]>([]);
    const [namedRanges, setNamedRanges] = useState<NamedRange[]>([]);
    const [isSheetLocked, setIsSheetLocked] = useState(false);
    const [customViews, setCustomViews] = useState<CustomView[]>([]);
    const [namedFormulas, setNamedFormulas] = useState<NamedFormula[]>([]);
    const [auditResult, setAuditResult] = useState<string | null>(null);
    const [goalSeekResult, setGoalSeekResult] = useState<any>(null);

    // Pivot table config from AI, to pre-fill the modal
    const [pivotConfigFromAI, setPivotConfigFromAI] = useState<PivotTableConfig | null>(null);

    useEffect(() => {
        localStorage.setItem('grida-chat-panel-open', JSON.stringify(isChatPanelOpen));
    }, [isChatPanelOpen]);


    useEffect(() => {
        const savedAnalysis = localStorage.getItem('grida-analysis');
        if (savedAnalysis) {
            try {
                const result: InitialAnalysisResponse = JSON.parse(savedAnalysis);
                setAnalysis(result);
                
                const chatSession = startChatSession(result.cleanedData);
                setChat(chatSession);

                const initialMessage: ChatMessage = {
                    role: 'model',
                    parts: [{ text: result.insights }],
                };
                setChatHistory([initialMessage]);
                setView('analysis');
            } catch (e) {
                console.error("Failed to parse saved data:", e);
                localStorage.removeItem('grida-analysis');
            }
        }
    }, []);

    const setupAnalysisState = (result: InitialAnalysisResponse) => {
        setAnalysis(result);
        const chatSession = startChatSession(result.cleanedData);
        setChat(chatSession);
        const initialMessage: ChatMessage = {
            role: 'model',
            parts: [{ text: result.insights }],
        };
        setChatHistory([initialMessage]);
        setView('analysis');
    };

    const handleProcessData = useCallback(async (context: string) => {
        if (!rawText.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await processRawData(rawText, context);
            setupAnalysisState(result);
        } catch (e: any) {
            setError(e.message || 'An unknown error occurred during analysis.');
        } finally {
            setIsLoading(false);
        }
    }, [rawText]);

    const handleGenerateFromTemplate = useCallback(async (prompt: string) => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await generateTemplate(prompt);
            setupAnalysisState(result);
        } catch (e: any) {
            setError(e.message || 'An unknown error occurred during template generation.');
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleStartEmpty = useCallback(() => {
        setIsLoading(true);
        setError(null);

        const emptyData = Array.from({ length: 20 }, () => ({ 'A': '', 'B': '', 'C': '', 'D': '', 'E': '' }));
        const emptyAnalysis: InitialAnalysisResponse = {
            cleanedData: emptyData,
            insights: "This is a blank canvas. Start by entering data into the cells, or ask me to set up a template for you (e.g., 'set up a monthly budget sheet').",
            suggestedQuestions: ["Set up a project plan", "Create columns for a contact list", "Make a simple to-do list"]
        };

        setupAnalysisState(emptyAnalysis);
        
        // Use a small timeout to allow state to propagate before view change
        setTimeout(() => {
            setIsLoading(false);
        }, 100);
    }, []);

    const handleToolCall = useCallback(async (toolCalls: ToolCall[], query: string) => {
        if (!analysis) return { toolResponses: [], confirmation: "Error: No data to edit.", needsDataUpdate: false };

        let updatedData = [...analysis.cleanedData];
        let confirmationMessage = '';
        let needsDataUpdate = false;

        for(const toolCall of toolCalls) {
            const { name, args } = toolCall;
            if (name === 'findAndReplace') {
                const { findValue, replaceValue, columns } = args;
                let changes = 0;
                const targetColumns = columns && columns.length > 0 ? columns : Object.keys(updatedData[0]);

                updatedData = updatedData.map(row => {
                    const newRow = { ...row };
                    for (const col of targetColumns) {
                        if (String(newRow[col]) === String(findValue)) {
                            const numericReplace = Number(replaceValue);
                            newRow[col] = !isNaN(numericReplace) && replaceValue.trim() !== '' ? numericReplace : replaceValue;
                            changes++;
                        }
                    }
                    return newRow;
                });
                confirmationMessage += `Found and replaced ${changes} instances of "${findValue}" with "${replaceValue}".\n`;
                needsDataUpdate = true;
            } else if (name === 'updateRows') {
                const { updates } = args as { updates: { rowIndex: number, column: string, newValue: string | number }[] };
                updates.forEach(({ rowIndex, column, newValue }) => {
                    if (updatedData[rowIndex] && updatedData[rowIndex][column] !== undefined) {
                        const numericValue = Number(newValue);
                        updatedData[rowIndex][column] = !isNaN(numericValue) && String(newValue).trim() !== '' ? numericValue : newValue;
                    }
                });
                confirmationMessage += `Updated ${updates.length} rows.\n`;
                needsDataUpdate = true;
            } else if (name === 'addRow') {
                const { rowData } = args as { rowData: Record<string, string | number> };
                const newRow = Object.keys(updatedData[0]).reduce((acc, header) => {
                    acc[header] = rowData[header] ?? ''; return acc;
                }, {} as Record<string, string | number>);
                updatedData.push(newRow);
                confirmationMessage += `Added 1 new row.\n`;
                needsDataUpdate = true;
            } else if (name === 'deleteRows') {
                const { rowIndices } = args as { rowIndices: number[] };
                const initialCount = updatedData.length;
                updatedData = updatedData.filter((_, index) => !rowIndices.includes(index));
                confirmationMessage += `Deleted ${initialCount - updatedData.length} row(s).\n`;
                needsDataUpdate = true;
            } else if (name === 'addColumn') {
                const { columnName, defaultValue = '' } = args as { columnName: string, defaultValue?: string | number };
                updatedData = updatedData.map(row => ({ ...row, [columnName]: defaultValue }));
                confirmationMessage += `Added new column: "${columnName}".\n`;
                needsDataUpdate = true;
            } else if (name === 'deleteColumn') {
                const { columnName } = args as { columnName: string };
                updatedData = updatedData.map(row => { const newRow = { ...row }; delete newRow[columnName]; return newRow; });
                confirmationMessage += `Deleted column: "${columnName}".\n`;
                needsDataUpdate = true;
            } else if (name === 'sortData' || name === 'sortDataMultiLevel') {
                 const criteria = name === 'sortData' ? [{ column: args.sortByColumn, order: args.order }] : args.criteria;
                 updatedData.sort((a, b) => {
                    for (const { column, order } of criteria) {
                        if (a[column] === undefined || b[column] === undefined) continue;
                        const valA = a[column], valB = b[column];
                        const isNumeric = typeof valA === 'number' && typeof valB === 'number';
                        let comparison = isNumeric ? (valA as number) - (valB as number) : String(valA).localeCompare(String(valB));
                        if (comparison !== 0) return order === 'ASC' ? comparison : -comparison;
                    }
                    return 0;
                 });
                 confirmationMessage += `Sorted data by ${criteria.map((c: any) => c.column).join(', ')}.\n`;
                 needsDataUpdate = true;
            } else if (name === 'applyFilter') {
                const { column, values, keep } = args;
                setSlicers(prev => {
                    const uniqueValuesInCol = new Set(updatedData.map(row => row[column]));
                    let newActiveFilters = new Set<string|number>();
                    if (keep) { uniqueValuesInCol.forEach(v => { if (!values.includes(v)) newActiveFilters.add(v); }); }
                    else { values.forEach((v: any) => newActiveFilters.add(v)); }
                    
                    const existingIdx = prev.findIndex(s => s.column === column);
                    if (existingIdx > -1) {
                        const newSlicers = [...prev];
                        newSlicers[existingIdx] = { ...newSlicers[existingIdx], activeFilters: newActiveFilters };
                        return newSlicers;
                    }
                    return [...prev, { column, activeFilters: newActiveFilters }];
                });
                confirmationMessage += `Applied filter on "${column}".\n`;
            } else if (name === 'applyNumberFormatting') {
                const { columns, format } = args as { columns: string[], format: 'CURRENCY' };
                if (format === 'CURRENCY') {
                    updatedData = updatedData.map(row => {
                        const newRow = { ...row };
                        for (const col of columns) {
                            if (newRow[col] !== undefined && newRow[col] !== null && String(newRow[col]).trim() !== '') {
                                // First, clean any existing formatting to get a raw number
                                const num = Number(String(newRow[col]).replace(/[^0-9.-]+/g, ''));
                                if (!isNaN(num)) {
                                    newRow[col] = new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'USD',
                                    }).format(num);
                                }
                            }
                        }
                        return newRow;
                    });
                }
                confirmationMessage += `Applied ${format} formatting to ${columns.length} column(s).\n`;
                needsDataUpdate = true;
            } else if (name === 'applyDataValidation') {
                const { range, rule } = args;
                const parsed = parseRange(range);
                if (parsed) {
                    setValidationRules(prev => {
                        const newRules = { ...prev };
                        for (let r = parsed.minRow; r <= parsed.maxRow; r++) {
                            for (let c = parsed.minCol; c <= parsed.maxCol; c++) {
                                newRules[`${r},${c}`] = rule;
                            }
                        }
                        return newRules;
                    });
                    confirmationMessage += `Applied data validation to ${range}.\n`;
                } else { confirmationMessage += `Invalid range for data validation: ${range}.\n`; }
            } else if (name === 'applyConditionalFormatting') {
                 const { range, rule } = args;
                 const parsed = parseRange(range);
                 if (parsed) {
                    setFormattingRules(prev => [...prev, { ...rule, range: parsed }]);
                    confirmationMessage += `Applied conditional formatting to ${range}.\n`;
                 } else { confirmationMessage += `Invalid range for conditional formatting: ${range}.\n`; }
            } else if (name === 'createPivotTable') {
                setPivotConfigFromAI(args.config);
                setIsPivotTableModalOpen(true);
                confirmationMessage += 'Opening pivot table builder with suggested configuration...\n';
            } else if (name === 'transformData') {
                try {
                    const result = await transformData(updatedData, args.instructions);
                    updatedData = result.rows.map(row => {
                        const obj: Record<string, any> = {};
                        result.headers.forEach((h, i) => { obj[h] = row[i]; });
                        return obj;
                    });
                    needsDataUpdate = true;
                    confirmationMessage += `Data transformed: ${result.summary}\n`;
                } catch (e: any) { confirmationMessage += `Data transformation failed: ${e.message}\n`; }
            } else if (name === 'createNamedRange') {
                const { name: rangeName, range } = args;
                const parsed = parseRange(range);
                if (parsed) {
                    setNamedRanges(prev => [...prev, { name: rangeName, range: parsed, isDynamic: false }]);
                    confirmationMessage += `Created named range "${rangeName}" for ${range}.\n`;
                } else { confirmationMessage += `Invalid range for named range: ${range}.\n`; }
            } else if (name === 'performGoalSeek') {
                 try {
                    const result = await performConversationalGoalSeek(updatedData, args.query);
                    if (result) {
                        setGoalSeekResult(result);
                        setIsGoalSeekModalOpen(true);
                        confirmationMessage += `Goal Seek solution found. Opening modal for review.\n`;
                    } else { confirmationMessage += `Could not find a Goal Seek solution for your query.\n`; }
                } catch (e: any) { confirmationMessage += `Goal Seek failed: ${e.message}\n`; }
            } else if (name === 'calculateFormula') {
                const { formula, targetRange } = args;
                try {
                    const result = await evaluateNaturalFormula(updatedData, formula);
                    const parsed = parseRange(targetRange);
                    if (parsed && result.result !== null) {
                        if (Array.isArray(result.result)) {
                            result.result.forEach((val, i) => {
                                const row = parsed.minRow + i;
                                if (updatedData[row]) updatedData[row][Object.keys(updatedData[0])[parsed.minCol]] = val;
                            });
                        } else {
                            updatedData[parsed.minRow][Object.keys(updatedData[0])[parsed.minCol]] = result.result;
                        }
                        needsDataUpdate = true;
                        confirmationMessage += `Calculated formula and placed result in ${targetRange}.\n`;
                    } else { confirmationMessage += `Could not evaluate formula or invalid target range.\n`; }
                } catch (e: any) { confirmationMessage += `Formula evaluation failed: ${e.message}\n`; }
            } else if (name === 'setSheetProtection') {
                setIsSheetLocked(args.locked);
                confirmationMessage += `Sheet is now ${args.locked ? 'locked' : 'unlocked'}.\n`;
            } else if (name === 'saveCustomView') {
                setCustomViews(prev => [...prev, { name: args.name, slicers }]);
                confirmationMessage += `Saved current view as "${args.name}".\n`;
            } else if (name === 'loadCustomView') {
                const view = customViews.find(v => v.name === args.name);
                if (view) {
                    setSlicers(view.slicers);
                    confirmationMessage += `Loaded custom view "${args.name}".\n`;
                } else { confirmationMessage += `Custom view "${args.name}" not found.\n`; }
            } else if (name === 'createNamedFormula') {
                setNamedFormulas(prev => [...prev, args as NamedFormula]);
                confirmationMessage += `Created named formula "${args.name}".\n`;
            }
        }
        
        if (needsDataUpdate) {
            setAnalysis({ ...analysis, cleanedData: updatedData });
        }

        const toolResponses = toolCalls.map(tc => ({
             functionResponse: { name: tc.name, response: { success: true, message: confirmationMessage } }
        }));

        return { toolResponses, confirmation: confirmationMessage, needsDataUpdate };
    }, [analysis, slicers, customViews]);

    const handleStopGeneration = useCallback(() => {
        cancellationRef.current = true;
        setIsLoading(false);
    }, []);
    
    const handleSendMessage = useCallback(async (message: string) => {
        if (!chat || !analysis) return;

        cancellationRef.current = false;
        
        const userMessage: ChatMessage = { role: 'user', parts: [{ text: message }] };
        setChatHistory(prev => [...prev, userMessage]);
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await sendMessageToChat(chat, message, analysis.cleanedData);
            if (cancellationRef.current) return;

            if (response.toolCalls && response.toolCalls.length > 0) {
                 const modelPart: ChatMessage = { role: 'model', parts: [{ text: response.answer }], toolCalls: response.toolCalls, query: message };
                 setChatHistory(prev => [...prev, modelPart]);

                 const { toolResponses, needsDataUpdate } = await handleToolCall(response.toolCalls, message);
                 if (cancellationRef.current) return;


                 if (needsDataUpdate) {
                    const toolMessage: ChatMessage = { role: 'tool', parts: toolResponses };
                    const finalResponse = await chat.sendMessage({ message: toolMessage.parts });
                    if (cancellationRef.current) return;

                    const finalModelMessage: ChatMessage = {
                         role: 'model',
                         parts: [{ text: finalResponse.text }],
                         ...(finalResponse.candidates?.[0]?.content?.parts.find(p => p.hasOwnProperty('functionResponse')) ? {} : { chart: (JSON.parse(finalResponse.text || '{}') as any).chart })
                    };

                    setChatHistory(prev => [...prev, toolMessage, finalModelMessage]);
                 }
            } else {
                 const modelMessage: ChatMessage = { role: 'model', parts: [{ text: response.answer }], ...response };
                 setChatHistory(prev => [...prev, modelMessage]);
            }

        } catch (e: any) {
            if (!cancellationRef.current) {
                setError(e.message || 'An unknown error occurred.');
            }
        } finally {
            setIsLoading(false);
            cancellationRef.current = false;
        }

    }, [chat, analysis, handleToolCall]);

    const handleDataChange = useCallback((newData: Record<string, string | number>[]) => {
        if (analysis) {
            setAnalysis({ ...analysis, cleanedData: newData });
        }
    }, [analysis]);

    const handleStartOver = () => {
        setView('input');
        setRawText('');
        setAnalysis(null);
        setChat(null);
        setChatHistory([]);
        setError(null);
        setSlicers([]);
        localStorage.removeItem('grida-analysis');
    };

    if (view === 'input') {
        return (
            <InputView
                rawText={rawText}
                setRawText={setRawText}
                initialContext={initialContext}
                setInitialContext={setInitialContext}
                onProcessData={() => handleProcessData(initialContext)}
                onGenerateFromTemplate={handleGenerateFromTemplate}
                onStartEmpty={handleStartEmpty}
                isLoading={isLoading}
                error={error}
            />
        );
    }

    if (view === 'analysis' && analysis) {
        return (
            <AnalysisView
                analysis={analysis}
                onDataChange={handleDataChange}
                chatHistory={chatHistory}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                onStartOver={handleStartOver}
                onStopGeneration={handleStopGeneration}
                slicers={slicers}
                setSlicers={setSlicers}
                isChatPanelOpen={isChatPanelOpen}
                setIsChatPanelOpen={setIsChatPanelOpen}
                // Pass down all state and setters
                isChartModalOpen={isChartModalOpen} setIsChartModalOpen={setIsChartModalOpen}
                isValidationModalOpen={isValidationModalOpen} setIsValidationModalOpen={setIsValidationModalOpen}
                isConditionalFormattingModalOpen={isConditionalFormattingModalOpen} setIsConditionalFormattingModalOpen={setIsConditionalFormattingModalOpen}
                isPivotTableModalOpen={isPivotTableModalOpen} setIsPivotTableModalOpen={setIsPivotTableModalOpen}
                isPowerQueryModalOpen={isPowerQueryModalOpen} setIsPowerQueryModalOpen={setIsPowerQueryModalOpen}
                isMacrosModalOpen={isMacrosModalOpen} setIsMacrosModalOpen={setIsMacrosModalOpen}
                isNamedRangesModalOpen={isNamedRangesModalOpen} setIsNamedRangesModalOpen={setIsNamedRangesModalOpen}
                isGoalSeekModalOpen={isGoalSeekModalOpen} setIsGoalSeekModalOpen={setIsGoalSeekModalOpen}
                isAdvancedSortModalOpen={isAdvancedSortModalOpen} setIsAdvancedSortModalOpen={setIsAdvancedSortModalOpen}
                isNamedFormulasModalOpen={isNamedFormulasModalOpen} setIsNamedFormulasModalOpen={setIsNamedFormulasModalOpen}
                isCustomViewsModalOpen={isCustomViewsModalOpen} setIsCustomViewsModalOpen={setIsCustomViewsModalOpen}
                isDataTableModalOpen={isDataTableModalOpen} setIsDataTableModalOpen={setIsDataTableModalOpen}
                isExplainSheetModalOpen={isExplainSheetModalOpen} setIsExplainSheetModalOpen={setIsExplainSheetModalOpen}
                isForecastingModalOpen={isForecastingModalOpen} setIsForecastingModalOpen={setIsForecastingModalOpen}
                chartData={chartData} setChartData={setChartData}
                validationRules={validationRules} setValidationRules={setValidationRules}
                formattingRules={formattingRules} setFormattingRules={setFormattingRules}
                namedRanges={namedRanges} setNamedRanges={setNamedRanges}
                isSheetLocked={isSheetLocked} setIsSheetLocked={setIsSheetLocked}
                customViews={customViews} setCustomViews={setCustomViews}
                namedFormulas={namedFormulas} setNamedFormulas={setNamedFormulas}
                auditResult={auditResult} setAuditResult={setAuditResult}
                goalSeekResult={goalSeekResult} setGoalSeekResult={setGoalSeekResult}
                pivotConfigFromAI={pivotConfigFromAI}
            />
        );
    }

    return null; // Or a loading/error state
};

export default App;
