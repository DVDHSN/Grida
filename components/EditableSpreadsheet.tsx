
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Spinner from './Spinner';
import SpreadsheetModal from './SpreadsheetModal';
import ChartDisplay from './ChartDisplay';
import { getChartForData, getFlashFillSuggestions, suggestRangeName } from '../services/geminiService';
// Fix: Import MultiSortConfig to correctly type the sorting criteria.
import type { Chart, ValidationRule, FormattingRule, PivotTableConfig, SlicerConfig, SparklineConfig, NamedRange, ChartTemplate, Macro, CustomFunction, ToolCall, ConversationalGoalSeekResponse, NamedFormula, CustomView, MultiSortConfig } from '../types';
import DataValidationModal from './DataValidationModal';
import Sparkline from './Sparkline';
import Slicer from './Slicer';
import NamedRangesModal from './NamedRangesModal';
import AuditingToast from './AuditingToast';
import GoalSeekModal from './GoalSeekModal';
import AdvancedSortModal from './AdvancedSortModal';
import NamedFormulasModal from './NamedFormulasModal';
import CustomViewsModal from './CustomViewsModal';
import DataTableModal from './DataTableModal';
import ConditionalFormattingModal from './ConditionalFormattingModal';
import PivotTableModal from './PivotTableModal';
import PowerQueryModal from './PowerQueryModal';
import MacrosModal from './MacrosModal';
import ForecastingModal from './ForecastingModal';
import { evaluateFormula } from './formulaUtils';

interface EditableSpreadsheetProps {
  initialData: Record<string, string | number>[];
  onDataChange: (newData: Record<string, string | number>[]) => void;
  chartTemplates: ChartTemplate[];
  onSaveChartTemplate: (name: string, options: any) => void;
  slicers: SlicerConfig[];
  setSlicers: React.Dispatch<React.SetStateAction<SlicerConfig[]>>;
  
  // Lifted state props
  isChartModalOpen: boolean; onSetIsChartModalOpen: (isOpen: boolean) => void;
  isValidationModalOpen: boolean; onSetIsValidationModalOpen: (isOpen: boolean) => void;
  isConditionalFormattingModalOpen: boolean; onSetIsConditionalFormattingModalOpen: (isOpen: boolean) => void;
  isPivotTableModalOpen: boolean; onSetIsPivotTableModalOpen: (isOpen: boolean) => void;
  isPowerQueryModalOpen: boolean; onSetIsPowerQueryModalOpen: (isOpen: boolean) => void;
  isMacrosModalOpen: boolean; onSetIsMacrosModalOpen: (isOpen: boolean) => void;
  isNamedRangesModalOpen: boolean; onSetIsNamedRangesModalOpen: (isOpen: boolean) => void;
  isGoalSeekModalOpen: boolean; onSetIsGoalSeekModalOpen: (isOpen: boolean) => void;
  isAdvancedSortModalOpen: boolean; onSetIsAdvancedSortModalOpen: (isOpen: boolean) => void;
  isNamedFormulasModalOpen: boolean; onSetIsNamedFormulasModalOpen: (isOpen: boolean) => void;
  isCustomViewsModalOpen: boolean; onSetIsCustomViewsModalOpen: (isOpen: boolean) => void;
  isDataTableModalOpen: boolean; onSetIsDataTableModalOpen: (isOpen: boolean) => void;
  isForecastingModalOpen: boolean; onSetIsForecastingModalOpen: (isOpen: boolean) => void;
  chartData: Chart | null; onSetChartData: (chart: Chart | null) => void;
  validationRules: Record<string, ValidationRule>; onSetValidationRules: React.Dispatch<React.SetStateAction<Record<string, ValidationRule>>>;
  formattingRules: FormattingRule[]; onSetFormattingRules: React.Dispatch<React.SetStateAction<FormattingRule[]>>;
  namedRanges: NamedRange[]; onSetNamedRanges: React.Dispatch<React.SetStateAction<NamedRange[]>>;
  isSheetLocked: boolean; onSetIsSheetLocked: (isLocked: boolean) => void;
  customViews: CustomView[]; onSetCustomViews: React.Dispatch<React.SetStateAction<CustomView[]>>;
  namedFormulas: NamedFormula[]; onSetNamedFormulas: React.Dispatch<React.SetStateAction<NamedFormula[]>>;
  auditResult: string | null; onSetAuditResult: (result: string | null) => void;
  goalSeekResult: any; onSetGoalSeekResult: (result: any) => void;
  pivotConfigFromAI: PivotTableConfig | null;
}

const EditableSpreadsheet: React.FC<EditableSpreadsheetProps> = (props) => {
    const { 
        initialData, onDataChange, chartTemplates, onSaveChartTemplate, slicers, setSlicers,
        isChartModalOpen, onSetIsChartModalOpen,
        isValidationModalOpen, onSetIsValidationModalOpen,
        isConditionalFormattingModalOpen, onSetIsConditionalFormattingModalOpen,
        isPivotTableModalOpen, onSetIsPivotTableModalOpen,
        isPowerQueryModalOpen, onSetIsPowerQueryModalOpen,
        isMacrosModalOpen, onSetIsMacrosModalOpen,
        isNamedRangesModalOpen, onSetIsNamedRangesModalOpen,
        isGoalSeekModalOpen, onSetIsGoalSeekModalOpen,
        isAdvancedSortModalOpen, onSetIsAdvancedSortModalOpen,
        isNamedFormulasModalOpen, onSetIsNamedFormulasModalOpen,
        isCustomViewsModalOpen, onSetIsCustomViewsModalOpen,
        isDataTableModalOpen, onSetIsDataTableModalOpen,
        isForecastingModalOpen, onSetIsForecastingModalOpen,
        chartData, onSetChartData,
        validationRules, onSetValidationRules,
        formattingRules, onSetFormattingRules,
        namedRanges, onSetNamedRanges,
        isSheetLocked, onSetIsSheetLocked,
        customViews, onSetCustomViews,
        namedFormulas, onSetNamedFormulas,
        auditResult, onSetAuditResult,
        goalSeekResult, onSetGoalSeekResult,
        pivotConfigFromAI
    } = props;
    
  const [data, setData] = useState(initialData);
  const [headers, setHeaders] = useState<string[]>(initialData.length > 0 ? Object.keys(initialData[0]) : []);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number; } | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  
  // Selection state
  const [selection, setSelection] = useState<{ minRow: number; maxRow: number; minCol: number; maxCol: number; } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const startCellRef = useRef<{ row: number; col: number } | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Feature states
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [sparklines, setSparklines] = useState<Record<string, SparklineConfig>>({}); // Keep local as it's purely visual
  const [macros, setMacros] = useState<Macro[]>([]); // Keep local for now

  // Flash fill state
  const [flashFillSuggestions, setFlashFillSuggestions] = useState<(string | null)[]>([]);
  const [flashFillTargetColumn, setFlashFillTargetColumn] = useState<string | null>(null);

  // Resizing state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const resizingRef = useRef<{ type: 'col' | 'row', index: number | string, startX: number, startY: number, startSize: number } | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'row' | 'col'; index: number; } | null>(null);

  // --- DERIVED STATE & MEMOS ---

    // Formula calculation engine
    const gridDisplayData = useMemo(() => {
        const displayData = data.map(row => headers.reduce((acc, h) => ({ ...acc, [h]: row[h] }), {} as Record<string, string | number>));
        const formulaCells: {row: number, col: number}[] = [];

        // Initialize displayData with raw values and identify formula cells
        data.forEach((row, r) => {
            headers.forEach((h, c) => {
                const val = row[h];
                if (typeof val === 'string' && val.startsWith('=')) {
                    formulaCells.push({row: r, col: c});
                }
            });
        });

        if (formulaCells.length === 0) {
            return displayData;
        }

        let changedInLastPass = true;
        let passes = 0;
        const maxPasses = formulaCells.length + 1; // A safe upper bound for iterations

        while (changedInLastPass && passes < maxPasses) {
            changedInLastPass = false;
            passes++;

            for (const {row, col} of formulaCells) {
                const formula = data[row][headers[col]] as string;
                
                // Create a 2D array representation of the *current* displayData for the evaluator
                const dataForEval = displayData.map(r => headers.map(h => r[h]));
                const newValue = evaluateFormula(formula, dataForEval);

                const header = headers[col];
                if (newValue !== displayData[row][header]) {
                    displayData[row][header] = newValue;
                    changedInLastPass = true;
                }
            }
        }
        
        // After iterating, if any formulas are still changing, they are part of a circular reference
        if (passes >= maxPasses && formulaCells.length > 0) {
            for (const {row, col} of formulaCells) {
                const header = headers[col];
                 const dataForEval = displayData.map(r => headers.map(h => r[h]));
                 const finalValue = evaluateFormula(data[row][header] as string, dataForEval);
                 if(finalValue !== displayData[row][header]) {
                     displayData[row][header] = '#CIRC!';
                 }
            }
        }

        return displayData;
    }, [data, headers]);


  const filteredData = useMemo(() => {
    // Start with the calculated data
    let currentData = gridDisplayData;
    if (slicers.length === 0) return currentData;
    
    // The slicer needs to filter based on original data, not computed data
    const originalIndicesToKeep = new Set(
        data
            .map((_, index) => index)
            .filter(index => {
                const row = data[index];
                return slicers.every(slicer => {
                    const cellValue = row[slicer.column];
                    return !slicer.activeFilters.has(cellValue);
                });
            })
    );

    return gridDisplayData.filter((_, index) => originalIndicesToKeep.has(index));
  }, [data, gridDisplayData, slicers]);

  useEffect(() => {
    const newHeaders = initialData.length > 0 ? Object.keys(initialData[0]) : ['A', 'B', 'C', 'D', 'E'];
    setData(initialData);
    setHeaders(newHeaders);
    
    const initialWidths: Record<string, number> = {};
    newHeaders.forEach(h => { initialWidths[h] = 120; });
    setColumnWidths(initialWidths);

  }, [initialData]);

  // Effect to close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);
  
  // --- RESIZING LOGIC ---
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    if (resizingRef.current.type === 'col') {
      const deltaX = e.clientX - resizingRef.current.startX;
      const newWidth = Math.max(40, resizingRef.current.startSize + deltaX);
      const colKey = resizingRef.current.index as string;
      setColumnWidths(prev => ({ ...prev, [colKey]: newWidth }));
    } else {
      const deltaY = e.clientY - resizingRef.current.startY;
      const newHeight = Math.max(28, resizingRef.current.startSize + deltaY);
      const rowIndex = resizingRef.current.index as number;
      setRowHeights(prev => ({ ...prev, [rowIndex]: newHeight }));
    }
  }, []);
  
  const handleMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
    resizingRef.current = null;
  }, [handleMouseMove]);
  
  const handleColResizeMouseDown = (e: React.MouseEvent, colIndex: number) => {
    e.preventDefault();
    const header = headers[colIndex];
    resizingRef.current = { type: 'col', index: header, startX: e.clientX, startY: 0, startSize: columnWidths[header] || 120 };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleRowResizeMouseDown = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    resizingRef.current = { type: 'row', index: rowIndex, startX: 0, startY: e.clientY, startSize: rowHeights[rowIndex] || 40 };
    document.body.style.cursor = 'row-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // --- EVENT HANDLERS ---

  const handleCellClick = (row: number, col: number) => {
    if(isSheetLocked) return;
    setEditingCell({ row, col });
    // Use raw data for editing to show formulas
    const value = data[row]?.[headers[col]] ?? '';
    setInputValue(String(value));
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = async () => {
    if (editingCell) {
        const { row, col } = editingCell;
        const header = headers[col];
        const newData = [...data];
        const oldVal = newData[row][header];
        
        let newVal: string | number = inputValue;
        // If it's not a formula, try to convert to a number
        if (!inputValue.startsWith('=')) {
            const numericValue = Number(inputValue);
            newVal = !isNaN(numericValue) && inputValue.trim() !== '' ? numericValue : inputValue;
        }

        if (oldVal !== newVal) {
            newData[row][header] = newVal;
            setData(newData); // This will trigger recalculation via useMemo
            onDataChange(newData);
            
            if (flashFillTargetColumn !== header) {
                const suggestions = await getFlashFillSuggestions(newData, header, row);
                if(suggestions.some(s => s !== null)) {
                    setFlashFillSuggestions(suggestions);
                    setFlashFillTargetColumn(header);
                }
            }
        }
    }
    setEditingCell(null);
  };
  
  // --- SELECTION LOGIC ---
  const getCellFromEvent = (e: React.MouseEvent<HTMLDivElement>): { row: number; col: number } | null => {
      const target = e.target as HTMLElement;
      const cell = target.closest('[data-row][data-col]');
      if (cell) {
          const row = parseInt(cell.getAttribute('data-row')!, 10);
          const col = parseInt(cell.getAttribute('data-col')!, 10);
          return { row, col };
      }
      return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      // Prevent starting selection when clicking a resizer handle or context menu
      if (target.closest('.context-menu') || target.classList.contains('col-resizer') || target.classList.contains('row-resizer')) {
          return;
      }
      e.preventDefault();
      setContextMenu(null); // Close context menu on any mousedown
      const cell = getCellFromEvent(e);
      if (cell) {
          setIsSelecting(true);
          startCellRef.current = cell;
          setSelection({ minRow: cell.row, maxRow: cell.row, minCol: cell.col, maxCol: cell.col });
      }
  };

  const handleMouseMoveSelection = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isSelecting && startCellRef.current) {
          const cell = getCellFromEvent(e);
          if (cell) {
              setSelection({
                  minRow: Math.min(startCellRef.current.row, cell.row),
                  maxRow: Math.max(startCellRef.current.row, cell.row),
                  minCol: Math.min(startCellRef.current.col, cell.col),
                  maxCol: Math.max(startCellRef.current.col, cell.col),
              });
          }
      }
  };

  const handleMouseUpSelection = () => {
      setIsSelecting(false);
      startCellRef.current = null;
  };
  
  const isCellSelected = useCallback((row: number, col: number) => {
      if (!selection) return false;
      return row >= selection.minRow && row <= selection.maxRow && col >= selection.minCol && col <= selection.maxCol;
  }, [selection]);

  // --- ROW/COLUMN MANIPULATION ---
  const handleRowContextMenu = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    // If right-clicked row is not in selection, create new selection
    if (!selection || rowIndex < selection.minRow || rowIndex > selection.maxRow) {
        setSelection({ minRow: rowIndex, maxRow: rowIndex, minCol: 0, maxCol: headers.length -1 });
    }
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'row', index: rowIndex });
  };
  
  const handleColContextMenu = (e: React.MouseEvent, colIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selection || colIndex < selection.minCol || colIndex > selection.maxCol) {
        setSelection({ minRow: 0, maxRow: data.length - 1, minCol: colIndex, maxCol: colIndex });
    }
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'col', index: colIndex });
  };
  
  const insertRow = (index: number) => {
    const newRow = headers.reduce((acc, header) => ({ ...acc, [header]: '' }), {});
    const newData = [...data];
    newData.splice(index, 0, newRow);
    setData(newData);
    onDataChange(newData);
  };
  
  const deleteSelectedRows = () => {
    if (!selection) return;
    const newData = data.filter((_, i) => i < selection.minRow || i > selection.maxRow);
    setData(newData);
    onDataChange(newData);
    setSelection(null);
  };

  const insertColumn = (index: number) => {
    const newColName = window.prompt("Enter new column name:");
    if (!newColName || headers.includes(newColName)) {
        if (newColName) alert("Column name already exists.");
        return;
    }

    const newHeaders = [...headers];
    newHeaders.splice(index, 0, newColName);

    // Reconstruct each row object based on the new header order to ensure consistency.
    const newData = data.map(row => {
      const newRow: Record<string, string | number> = {};
      newHeaders.forEach(header => {
        // If the header exists in the old row, copy its value, otherwise it's the new column.
        newRow[header] = row.hasOwnProperty(header) ? row[header] : '';
      });
      return newRow;
    });

    setHeaders(newHeaders);
    setData(newData);
    onDataChange(newData);
  };

  const deleteSelectedColumns = () => {
    if (!selection) return;
    const colsToDelete = new Set(headers.slice(selection.minCol, selection.maxCol + 1));
    const newHeaders = headers.filter(h => !colsToDelete.has(h));
// FIX: Replace the faulty `delete` operation with an immutable approach using `Object.fromEntries` and `filter`.
// This creates a new object with only the desired properties, avoiding potential TypeScript errors.
    const newData = data.map(row => {
      return Object.fromEntries(
        Object.entries(row).filter(([key]) => !colsToDelete.has(key))
      );
    });
    setHeaders(newHeaders);
    setData(newData);
    onDataChange(newData);
    setSelection(null);
  };

  // --- FEATURE HANDLERS ---
  const handleGenerateChart = useCallback(async (chartType: string = 'auto') => {
    if (!selection) {
      alert("Please select a range of data to chart.");
      return;
    }
    setIsLoadingChart(true);
    onSetIsChartModalOpen(true);
    onSetChartData(null);
    const selectedData = data
      .slice(selection.minRow, selection.maxRow + 1)
      .map(row => {
          const selectedRow: Record<string, any> = {};
          headers.slice(selection.minCol, selection.maxCol + 1).forEach(h => {
              selectedRow[h] = row[h];
          });
          return selectedRow;
      });

    const chart = await getChartForData(selectedData, chartType);
    onSetChartData(chart);
    setIsLoadingChart(false);
  }, [selection, data, headers, onSetIsChartModalOpen, onSetChartData]);
  
  const handleApplyValidation = useCallback((rule: ValidationRule) => {
    if (!selection) return;
    const newRules: Record<string, ValidationRule> = {};
    for (let r = selection.minRow; r <= selection.maxRow; r++) {
        for (let c = selection.minCol; c <= selection.maxCol; c++) {
            newRules[`${r},${c}`] = rule;
        }
    }
    onSetValidationRules(prev => ({...prev, ...newRules}));
    onSetIsValidationModalOpen(false);
  }, [selection, onSetValidationRules, onSetIsValidationModalOpen]);

  const handleRemoveValidation = useCallback(() => {
    if (!selection) return;
    onSetValidationRules(prev => {
        const newRules = { ...prev };
        for (let r = selection.minRow; r <= selection.maxRow; r++) {
            for (let c = selection.minCol; c <= selection.maxCol; c++) {
                delete newRules[`${r},${c}`];
            }
        }
        return newRules;
    });
    onSetIsValidationModalOpen(false);
  }, [selection, onSetValidationRules, onSetIsValidationModalOpen]);
  
  const handleApplyFormatting = (rule: Omit<FormattingRule, 'range'>) => {
    if (!selection) return;
    onSetFormattingRules(prev => [...prev, { ...rule, range: selection }]);
    onSetIsConditionalFormattingModalOpen(false);
  };
  
  const handleApplyTransformedData = (newData: Record<string, any>[]) => {
      setData(newData);
      setHeaders(Object.keys(newData[0] || {}));
      onDataChange(newData);
  };
  
  const handleApplyMacro = (actions: ToolCall[]) => {
      alert("Macro execution from UI not implemented yet. AI can trigger tools directly.");
  };
  
  const handleSuggestRangeName = async (): Promise<string> => {
    if (!selection) return '';
    const headersInRange = headers.slice(selection.minCol, selection.maxCol + 1);
    const dataSample = data
        .slice(selection.minRow, Math.min(selection.maxRow + 1, selection.minRow + 10))
        .map(row => {
            const sampleRow: Record<string, any> = {};
            headersInRange.forEach(h => { sampleRow[h] = row[h]; });
            return sampleRow;
        });
    
    return await suggestRangeName(dataSample, headersInRange);
  };
  
  const handleApplyGoalSeek = (result: ConversationalGoalSeekResponse) => {
    const { cellToChange, newValue } = result;
    const newData = [...data];
    newData[cellToChange.rowIndex][cellToChange.columnHeader] = newValue;
    setData(newData);
    onDataChange(newData);
  };
  
  const handleApplySort = (criteria: MultiSortConfig[]) => {
    const newData = [...data];
    newData.sort((a, b) => {
       for (const { column, order } of criteria) {
           if (a[column] === undefined || b[column] === undefined) continue;
           const valA = a[column], valB = b[column];
           const isNumeric = typeof valA === 'number' && typeof valB === 'number';
           let comparison = isNumeric ? (valA as number) - (valB as number) : String(valA).localeCompare(String(valB));
           if (comparison !== 0) return order === 'ASC' ? comparison : -comparison;
       }
       return 0;
    });
    setData(newData);
    onDataChange(newData);
  };
  
  const handleApplyFlashFill = () => {
      if (!flashFillTargetColumn) return;
      const newData = [...data];
      flashFillSuggestions.forEach((suggestion, index) => {
          if (suggestion !== null && newData[index]) {
              newData[index][flashFillTargetColumn] = suggestion;
          }
      });
      setData(newData);
      onDataChange(newData);
      setFlashFillSuggestions([]);
      setFlashFillTargetColumn(null);
  };
  
  // --- RENDERING LOGIC ---
  const getCellBackgroundColor = (row: number, col: number) => {
    for (const rule of formattingRules) {
        if (row >= rule.range.minRow && row <= rule.range.maxRow && col >= rule.range.minCol && col <= rule.range.maxCol) {
            const cellValue = gridDisplayData[row][headers[col]];
            let isMatch = false;
            const numValue = Number(cellValue);
            const numRuleValue1 = Number(rule.value1);
            const numRuleValue2 = Number(rule.value2);

            switch(rule.type) {
                case 'gt': isMatch = !isNaN(numValue) && numValue > numRuleValue1; break;
                case 'lt': isMatch = !isNaN(numValue) && numValue < numRuleValue1; break;
                case 'eq': isMatch = String(cellValue) == String(rule.value1); break;
                case 'neq': isMatch = String(cellValue) != String(rule.value1); break;
                case 'between': isMatch = !isNaN(numValue) && numValue >= numRuleValue1 && numValue <= numRuleValue2; break;
                case 'text_contains': isMatch = String(cellValue).toLowerCase().includes(String(rule.value1).toLowerCase()); break;
                case 'text_not_contains': isMatch = !String(cellValue).toLowerCase().includes(String(rule.value1).toLowerCase()); break;
            }
            if (isMatch) return rule.style.backgroundColor;
        }
    }
    return isCellSelected(row, col) ? '#444444' : '#2A2A2A';
  };
  
  const isCellValid = (row: number, col: number) => {
      const rule = validationRules[`${row},${col}`];
      if (!rule) return true;
      
      const value = data[row][headers[col]];
      if (rule.allowBlank && (value === '' || value === null || value === undefined)) return true;

      switch(rule.type) {
          // Simplified validation checks for UI feedback
          case 'number': return typeof value === 'number';
          case 'list': return rule.listValues?.includes(String(value)) ?? false;
          case 'text':
              if (rule.textCriteria === 'email') return /\S+@\S+\.\S+/.test(String(value));
              if (rule.textCriteria === 'url') try { new URL(String(value)); return true; } catch { return false; }
              return true; // Contains/not_contains is too complex for simple UI check
          default: return true;
      }
  };

  const renderContextMenu = () => {
    if (!contextMenu) return null;

    const menuStyle = { top: `${contextMenu.y}px`, left: `${contextMenu.x}px` };
    
    if (contextMenu.type === 'row') {
        const numRows = (selection?.maxRow ?? 0) - (selection?.minRow ?? 0) + 1;
        return (
            <div style={menuStyle} className="context-menu fixed bg-[#2A2A2A] border border-[#444] rounded-md shadow-lg z-50 py-1 animate-fade-in" onClick={e => e.stopPropagation()}>
                <button onClick={() => insertRow(contextMenu.index)} className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-[#3A3A3A]">Insert row above</button>
                <button onClick={() => insertRow(contextMenu.index + 1)} className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-[#3A3A3A]">Insert row below</button>
                <div className="my-1 h-[1px] bg-[#444]"></div>
                <button onClick={deleteSelectedRows} className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-[#3A3A3A]">Delete row{numRows > 1 ? 's' : ''}</button>
            </div>
        );
    }
    
    if (contextMenu.type === 'col') {
        const numCols = (selection?.maxCol ?? 0) - (selection?.minCol ?? 0) + 1;
        return (
             <div style={menuStyle} className="context-menu fixed bg-[#2A2A2A] border border-[#444] rounded-md shadow-lg z-50 py-1 animate-fade-in" onClick={e => e.stopPropagation()}>
                <button onClick={() => insertColumn(contextMenu.index)} className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-[#3A3A3A]">Insert column left</button>
                <button onClick={() => insertColumn(contextMenu.index + 1)} className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-[#3A3A3A]">Insert column right</button>
                <div className="my-1 h-[1px] bg-[#444]"></div>
                <button onClick={deleteSelectedColumns} className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-[#3A3A3A]">Delete column{numCols > 1 ? 's' : ''}</button>
            </div>
        );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#1e1e1e] border border-[#333] rounded-md">
      {/* Flash Fill suggestion */}
      {flashFillSuggestions.length > 0 && flashFillTargetColumn && (
          <div className="flex-shrink-0 flex items-center justify-between p-2 mb-2 bg-[#3a1525] border border-[#60233d] rounded-md animate-fade-in">
              <p className="text-sm text-gray-200">AI suggests a pattern for the '{flashFillTargetColumn}' column.</p>
              <div>
                  <button onClick={() => setFlashFillSuggestions([])} className="cancel-btn text-xs py-1 px-2 mr-2">Dismiss</button>
                  <button onClick={handleApplyFlashFill} className="action-btn text-xs py-1 px-2">Apply Suggestions</button>
              </div>
          </div>
      )}
      
      {/* Spreadsheet Grid */}
      <div 
        ref={gridContainerRef}
        className="flex-grow overflow-auto bg-[#1E1E1E] p-1"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMoveSelection} onMouseUp={handleMouseUpSelection} onMouseLeave={handleMouseUpSelection}
      >
        <div className="grid" style={{ gridTemplateColumns: `50px ${headers.map(h => `${columnWidths[h] || 120}px`).join(' ')}` }}>
          {/* Header Row */}
          <div className="sticky top-0 bg-[#333] z-20"></div> {/* Corner */}
          {headers.map((header, colIndex) => (
            <div 
                key={colIndex} 
                onContextMenu={(e) => handleColContextMenu(e, colIndex)}
                className="relative sticky top-0 bg-[#333] text-center font-semibold py-2 px-2 border-b border-l border-[#444] z-10 whitespace-nowrap overflow-hidden text-ellipsis flex items-center justify-center select-none"
             >
              <span>{header}</span>
              <div 
                onMouseDown={(e) => handleColResizeMouseDown(e, colIndex)} 
                className="col-resizer absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-[#800020] z-20"
              />
            </div>
          ))}

          {/* Data Rows */}
          {filteredData.map((row, rowIndex) => {
            const rowStyle = { height: rowHeights[rowIndex] ? `${rowHeights[rowIndex]}px` : 'auto' };
            return (
            <React.Fragment key={rowIndex}>
              <div 
                onContextMenu={(e) => handleRowContextMenu(e, rowIndex)}
                className="relative sticky left-0 bg-[#333] text-center text-gray-400 border-r border-t border-[#444] z-10 flex items-center justify-center select-none" style={rowStyle}
               >
                {rowIndex + 1}
                 <div 
                  onMouseDown={(e) => handleRowResizeMouseDown(e, rowIndex)}
                  className="row-resizer absolute bottom-0 left-0 w-full h-1.5 cursor-row-resize hover:bg-[#800020] z-20"
                />
              </div>
              {headers.map((header, colIndex) => {
                const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                const cellValue = row[header];
                const isValid = isCellValid(rowIndex, colIndex);
                const showFlashSuggestion = flashFillTargetColumn === header && flashFillSuggestions[rowIndex] !== null;
                const isError = typeof cellValue === 'string' && cellValue.startsWith('#');

                return (
                  <div
                    key={colIndex}
                    className={`relative p-2 border-b border-r border-[#333] text-sm text-[#E0E0E0] outline-none whitespace-nowrap overflow-hidden text-ellipsis flex items-center min-h-[40px] ${isError ? 'text-red-400 font-mono italic' : ''}`}
                    style={{ backgroundColor: getCellBackgroundColor(rowIndex, colIndex), ...rowStyle }}
                    data-row={rowIndex}
                    data-col={colIndex}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                  >
                    {!isValid && <div className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-t-red-500 border-l-[8px] border-l-transparent"></div>}

                    {isEditing ? (
                      <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={(e) => e.key === 'Enter' && handleInputBlur()}
                        autoFocus
                        className="w-full h-full bg-transparent border-none outline-none p-0"
                      />
                    ) : (
                      <>
                        {showFlashSuggestion && (
                            <span className="text-gray-500 italic">{flashFillSuggestions[rowIndex]}</span>
                        )}
                        {!showFlashSuggestion && (
                           typeof cellValue === 'string' && cellValue.match(/\[.*\]\(.*\)/)
                           ? <a href={cellValue.match(/\((.*?)\)/)?.[1]} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline" onClick={e=>e.stopPropagation()}>{cellValue.match(/\[(.*?)\]/)?.[1]}</a>
                           : String(cellValue)
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          )})}
        </div>
      </div>
      
      {/* Context Menu */}
      {renderContextMenu()}

      {/* Modals */}
      <SpreadsheetModal isOpen={isChartModalOpen} onClose={() => onSetIsChartModalOpen(false)} title="Chart">
        {isLoadingChart ? (
            <div className="flex items-center justify-center h-full"><Spinner /> <span className="ml-2">Generating Chart...</span></div>
        ) : chartData ? (
            <ChartDisplay chart={chartData} templates={chartTemplates} onSaveTemplate={onSaveChartTemplate} />
        ) : (
             <div className="flex items-center justify-center h-full text-gray-400">Could not generate a chart for the selected data.</div>
        )}
      </SpreadsheetModal>
      
      <DataValidationModal
          isOpen={isValidationModalOpen}
          onClose={() => onSetIsValidationModalOpen(false)}
          onApply={handleApplyValidation}
          onRemove={handleRemoveValidation}
      />
      
      <ConditionalFormattingModal 
          isOpen={isConditionalFormattingModalOpen}
          onClose={() => onSetIsConditionalFormattingModalOpen(false)}
          onApply={handleApplyFormatting}
      />
      
      <PivotTableModal
          isOpen={isPivotTableModalOpen}
          onClose={() => onSetIsPivotTableModalOpen(false)}
          data={data}
          headers={headers}
          initialConfig={pivotConfigFromAI}
      />

      <PowerQueryModal
          isOpen={isPowerQueryModalOpen}
          onClose={() => onSetIsPowerQueryModalOpen(false)}
          onApply={handleApplyTransformedData}
          data={data}
      />
      
      <MacrosModal
          isOpen={isMacrosModalOpen}
          onClose={() => onSetIsMacrosModalOpen(false)}
          macros={macros}
          onSave={(macro) => setMacros(prev => [...prev, macro])}
          onApply={handleApplyMacro}
          data={data}
      />

      <NamedRangesModal 
        isOpen={isNamedRangesModalOpen}
        onClose={() => onSetIsNamedRangesModalOpen(false)}
        namedRanges={namedRanges}
        setNamedRanges={onSetNamedRanges}
        onSuggest={handleSuggestRangeName}
      />

      <GoalSeekModal
        isOpen={isGoalSeekModalOpen}
        onClose={() => onSetIsGoalSeekModalOpen(false)}
        data={data}
        onApply={handleApplyGoalSeek}
        initialResult={goalSeekResult}
      />

      <AdvancedSortModal 
        isOpen={isAdvancedSortModalOpen}
        onClose={() => onSetIsAdvancedSortModalOpen(false)}
        headers={headers}
        onApply={handleApplySort}
      />
      
      <NamedFormulasModal 
        isOpen={isNamedFormulasModalOpen}
        onClose={() => onSetIsNamedFormulasModalOpen(false)}
        namedFormulas={namedFormulas}
        onSave={(formula) => onSetNamedFormulas(prev => [...prev, formula])}
        onDelete={(name) => onSetNamedFormulas(prev => prev.filter(f => f.name !== name))}
      />
      
      <CustomViewsModal
        isOpen={isCustomViewsModalOpen}
        onClose={() => onSetIsCustomViewsModalOpen(false)}
        customViews={customViews}
        onSave={(name) => onSetCustomViews(prev => [...prev, { name, slicers }])}
        onLoad={(view) => { setSlicers(view.slicers); onSetIsCustomViewsModalOpen(false); }}
        onDelete={(name) => onSetCustomViews(prev => prev.filter(v => v.name !== name))}
      />

      <DataTableModal 
        isOpen={isDataTableModalOpen}
        onClose={() => onSetIsDataTableModalOpen(false)}
        headers={headers}
        onGenerate={(config) => alert("Data Table generation UI not implemented yet.")}
      />
      
      <ForecastingModal
          isOpen={isForecastingModalOpen}
          onClose={() => onSetIsForecastingModalOpen(false)}
          data={data}
          headers={headers}
      />
      
      {/* Toasts */}
      {auditResult && <AuditingToast message={auditResult} onClose={() => onSetAuditResult(null)} />}
    </div>
  );
};

export default EditableSpreadsheet;