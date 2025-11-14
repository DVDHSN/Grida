
import React, { useState } from 'react';
import type { InitialAnalysisResponse, ChatMessage, ChartTemplate, SlicerConfig, ValidationRule, FormattingRule, NamedRange, CustomView, NamedFormula, PivotTableConfig, Chart } from '../types';
import EditableSpreadsheet from './EditableSpreadsheet';
import ChatPanel from './ChatPanel';
import ExplainSheetModal from './ExplainSheetModal';
import { explainSheet } from '../services/geminiService';
import Sidebar from './Sidebar';
import DropdownMenu from './DropdownMenu';
import Slicer from './Slicer';


interface AnalysisViewProps {
  analysis: InitialAnalysisResponse;
  onDataChange: (newData: Record<string, string | number>[]) => void;
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onStartOver: () => void;
  onStopGeneration: () => void;
  slicers: SlicerConfig[];
  setSlicers: React.Dispatch<React.SetStateAction<SlicerConfig[]>>;
  isChatPanelOpen: boolean;
  setIsChatPanelOpen: (isOpen: boolean) => void;
  
  // Lifted state and setters from App.tsx
  isChartModalOpen: boolean; setIsChartModalOpen: (isOpen: boolean) => void;
  isValidationModalOpen: boolean; setIsValidationModalOpen: (isOpen: boolean) => void;
  isConditionalFormattingModalOpen: boolean; setIsConditionalFormattingModalOpen: (isOpen: boolean) => void;
  isPivotTableModalOpen: boolean; setIsPivotTableModalOpen: (isOpen: boolean) => void;
  isPowerQueryModalOpen: boolean; setIsPowerQueryModalOpen: (isOpen: boolean) => void;
  isMacrosModalOpen: boolean; setIsMacrosModalOpen: (isOpen: boolean) => void;
  isNamedRangesModalOpen: boolean; setIsNamedRangesModalOpen: (isOpen: boolean) => void;
  isGoalSeekModalOpen: boolean; setIsGoalSeekModalOpen: (isOpen: boolean) => void;
  isAdvancedSortModalOpen: boolean; setIsAdvancedSortModalOpen: (isOpen: boolean) => void;
  isNamedFormulasModalOpen: boolean; setIsNamedFormulasModalOpen: (isOpen: boolean) => void;
  isCustomViewsModalOpen: boolean; setIsCustomViewsModalOpen: (isOpen: boolean) => void;
  isDataTableModalOpen: boolean; setIsDataTableModalOpen: (isOpen: boolean) => void;
  isExplainSheetModalOpen: boolean; setIsExplainSheetModalOpen: (isOpen: boolean) => void;
  isForecastingModalOpen: boolean; setIsForecastingModalOpen: (isOpen: boolean) => void;
  chartData: Chart | null; setChartData: (chart: Chart | null) => void;
  validationRules: Record<string, ValidationRule>; setValidationRules: React.Dispatch<React.SetStateAction<Record<string, ValidationRule>>>;
  formattingRules: FormattingRule[]; setFormattingRules: React.Dispatch<React.SetStateAction<FormattingRule[]>>;
  namedRanges: NamedRange[]; setNamedRanges: React.Dispatch<React.SetStateAction<NamedRange[]>>;
  isSheetLocked: boolean; setIsSheetLocked: (isLocked: boolean) => void;
  customViews: CustomView[]; setCustomViews: React.Dispatch<React.SetStateAction<CustomView[]>>;
  namedFormulas: NamedFormula[]; setNamedFormulas: React.Dispatch<React.SetStateAction<NamedFormula[]>>;
  auditResult: string | null; setAuditResult: (result: string | null) => void;
  goalSeekResult: any; setGoalSeekResult: (result: any) => void;
  pivotConfigFromAI: PivotTableConfig | null;
}

const AnalysisView: React.FC<AnalysisViewProps> = (props) => {
  const { analysis, onDataChange, chatHistory, onSendMessage, isLoading, onStartOver, slicers, setSlicers, isChatPanelOpen, setIsChatPanelOpen, onStopGeneration } = props;
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [chartTemplates, setChartTemplates] = useState<ChartTemplate[]>([]);

  // State for Explain Sheet feature
  const [explanationText, setExplanationText] = useState('');
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);

  const handleSaveChartTemplate = (name: string, options: any) => {
    if (chartTemplates.some(t => t.name === name)) {
        if (!window.confirm("A template with that name already exists. Overwrite it?")) return;
        setChartTemplates(prev => prev.map(t => t.name === name ? {name, options} : t));
    } else {
        setChartTemplates(prev => [...prev, { name, options }]);
    }
    alert(`Template "${name}" saved!`);
  };

  const handleSave = () => {
      setSaveStatus('saving');
      try {
          localStorage.setItem('grida-analysis', JSON.stringify(analysis));
          setSaveStatus('saved');
          setTimeout(() => {
              setSaveStatus('idle');
          }, 2000);
      } catch (e) {
          console.error("Failed to save data:", e);
          alert("Could not save data. The data might be too large for your browser's local storage.");
          setSaveStatus('idle');
      }
  };
  
  const handleExplainSheet = async () => {
      props.setIsExplainSheetModalOpen(true);
      setIsExplanationLoading(true);
      try {
          const result = await explainSheet(analysis.cleanedData);
          setExplanationText(result);
      } catch (e) {
          setExplanationText("Sorry, an error occurred while generating the explanation.");
          console.error(e);
      } finally {
          setIsExplanationLoading(false);
      }
  };

  const saveButtonText = {
      idle: 'Save',
      saving: 'Saving...',
      saved: 'Saved!'
  };

  const handleAddSlicer = () => {
      // This is a placeholder as the selection logic is in EditableSpreadsheet
      // A better implementation would involve lifting selection state or using a context
      alert("To add a slicer, select a single column in the grid, then use the 'Data' menu.");
  };

  const menuItems = {
      "Data": [
          { label: "Sort (Advanced)...", action: () => props.setIsAdvancedSortModalOpen(true), shortcut: "Ctrl+Alt+S" },
          { label: "Add Slicer for Selection", action: handleAddSlicer },
          { label: "Data Validation...", action: () => props.setIsValidationModalOpen(true) },
          { label: "Pivot Table...", action: () => props.setIsPivotTableModalOpen(true) },
          { label: "Data Transformation...", action: () => props.setIsPowerQueryModalOpen(true) },
      ],
      "Tools": [
          { label: "Forecasting...", action: () => props.setIsForecastingModalOpen(true) },
          { label: "Macros...", action: () => props.setIsMacrosModalOpen(true) },
          { label: "Named Ranges...", action: () => props.setIsNamedRangesModalOpen(true) },
          { label: "Named Formulas...", action: () => props.setIsNamedFormulasModalOpen(true) },
          { label: "Goal Seek...", action: () => props.setIsGoalSeekModalOpen(true) },
          { label: "Data Table (What-If)...", action: () => props.setIsDataTableModalOpen(true) },
      ],
      "View": [
          { label: "Lock/Unlock Sheet", action: () => props.setIsSheetLocked(!props.isSheetLocked) },
          { label: "Custom Views...", action: () => props.setIsCustomViewsModalOpen(true) },
      ],
      "Insert": [
          // This would ideally be triggered from within EditableSpreadsheet based on selection
          { label: "Chart from Selection...", action: () => props.setIsChartModalOpen(true) },
      ]
  };
  
  const handleSlicerChange = (column: string, value: string | number) => {
    setSlicers(prevSlicers => {
        return prevSlicers.map(slicer => {
            if (slicer.column === column) {
                const newFilters = new Set(slicer.activeFilters);
                if (newFilters.has(value)) {
                    newFilters.delete(value);
                } else {
                    newFilters.add(value);
                }
                return { ...slicer, activeFilters: newFilters };
            }
            return slicer;
        });
    });
  };
  
  const handleClearSlicer = (column: string) => {
    setSlicers(prevSlicers => {
        return prevSlicers.map(slicer => 
            slicer.column === column ? { ...slicer, activeFilters: new Set() } : slicer
        );
    });
  };

  return (
    <div className="h-screen w-screen bg-[#121212] flex overflow-hidden">
        <Sidebar
            isChatOpen={isChatPanelOpen}
            onToggleChat={() => setIsChatPanelOpen(!isChatPanelOpen)}
            onExplainSheet={handleExplainSheet}
            onOpenCharts={() => props.setIsChartModalOpen(true)}
            onOpenPivot={() => props.setIsPivotTableModalOpen(true)}
            onOpenTransform={() => props.setIsPowerQueryModalOpen(true)}
        />
        
        <div className="flex-1 flex flex-col min-w-0">
            {/* Toolbar */}
            <header className="flex-shrink-0 bg-[#1e1e1e] border-b border-[#333] px-4 py-2 flex justify-between items-center">
                <div className="flex items-center gap-1">
                    <h1 className="text-xl font-lora font-semibold text-[#E0E0E0] mr-4">Grida Workspace</h1>
                    <DropdownMenu title="Data" items={menuItems.Data} />
                    <DropdownMenu title="Tools" items={menuItems.Tools} />
                    <DropdownMenu title="View" items={menuItems.View} />
                    <DropdownMenu title="Insert" items={menuItems.Insert} />
                    <div className="w-[1px] h-6 bg-[#444] mx-2"></div>
                    <button onClick={() => props.setIsConditionalFormattingModalOpen(true)} className="toolbar-btn">
                        Conditional Formatting
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={saveStatus !== 'idle'}
                        className="cancel-btn py-2 px-4"
                    >
                        {saveButtonText[saveStatus]}
                    </button>
                    <button
                        onClick={onStartOver}
                        className="secondary-btn py-2 px-4"
                    >
                        Start Over
                    </button>
                </div>
            </header>

            {/* Main content with spreadsheet */}
            <main className="flex-grow p-4 min-h-0 flex flex-col gap-4">
                 {slicers.length > 0 && (
                    <div className="flex-shrink-0 flex gap-4">
                        {slicers.map(slicer => (
                            <Slicer 
                                key={slicer.column}
                                column={slicer.column}
                                uniqueValues={Array.from(new Set(analysis.cleanedData.map(row => row[slicer.column])))}
                                activeFilters={slicer.activeFilters}
                                onFilterChange={handleSlicerChange}
                                onClear={handleClearSlicer}
                            />
                        ))}
                    </div>
                )}
                <div className="flex-grow min-h-0">
                    {/* FIX: Pass all props explicitly to EditableSpreadsheet with correct names */}
                    <EditableSpreadsheet
                        initialData={analysis.cleanedData}
                        onDataChange={onDataChange}
                        chartTemplates={chartTemplates}
                        onSaveChartTemplate={handleSaveChartTemplate}
                        slicers={slicers}
                        setSlicers={setSlicers}
                        isChartModalOpen={props.isChartModalOpen}
                        onSetIsChartModalOpen={props.setIsChartModalOpen}
                        isValidationModalOpen={props.isValidationModalOpen}
                        onSetIsValidationModalOpen={props.setIsValidationModalOpen}
                        isConditionalFormattingModalOpen={props.isConditionalFormattingModalOpen}
                        onSetIsConditionalFormattingModalOpen={props.setIsConditionalFormattingModalOpen}
                        isPivotTableModalOpen={props.isPivotTableModalOpen}
                        onSetIsPivotTableModalOpen={props.setIsPivotTableModalOpen}
                        isPowerQueryModalOpen={props.isPowerQueryModalOpen}
                        onSetIsPowerQueryModalOpen={props.setIsPowerQueryModalOpen}
                        isMacrosModalOpen={props.isMacrosModalOpen}
                        onSetIsMacrosModalOpen={props.setIsMacrosModalOpen}
                        isNamedRangesModalOpen={props.isNamedRangesModalOpen}
                        onSetIsNamedRangesModalOpen={props.setIsNamedRangesModalOpen}
                        isGoalSeekModalOpen={props.isGoalSeekModalOpen}
                        onSetIsGoalSeekModalOpen={props.setIsGoalSeekModalOpen}
                        isAdvancedSortModalOpen={props.isAdvancedSortModalOpen}
                        onSetIsAdvancedSortModalOpen={props.setIsAdvancedSortModalOpen}
                        isNamedFormulasModalOpen={props.isNamedFormulasModalOpen}
                        onSetIsNamedFormulasModalOpen={props.setIsNamedFormulasModalOpen}
                        isCustomViewsModalOpen={props.isCustomViewsModalOpen}
                        onSetIsCustomViewsModalOpen={props.setIsCustomViewsModalOpen}
                        isDataTableModalOpen={props.isDataTableModalOpen}
                        onSetIsDataTableModalOpen={props.setIsDataTableModalOpen}
                        isForecastingModalOpen={props.isForecastingModalOpen}
                        onSetIsForecastingModalOpen={props.setIsForecastingModalOpen}
                        chartData={props.chartData}
                        onSetChartData={props.setChartData}
                        validationRules={props.validationRules}
                        onSetValidationRules={props.setValidationRules}
                        formattingRules={props.formattingRules}
                        onSetFormattingRules={props.setFormattingRules}
                        namedRanges={props.namedRanges}
                        onSetNamedRanges={props.setNamedRanges}
                        isSheetLocked={props.isSheetLocked}
                        onSetIsSheetLocked={props.setIsSheetLocked}
                        customViews={props.customViews}
                        onSetCustomViews={props.setCustomViews}
                        namedFormulas={props.namedFormulas}
                        onSetNamedFormulas={props.setNamedFormulas}
                        auditResult={props.auditResult}
                        onSetAuditResult={props.setAuditResult}
                        goalSeekResult={props.goalSeekResult}
                        onSetGoalSeekResult={props.setGoalSeekResult}
                        pivotConfigFromAI={props.pivotConfigFromAI}
                    />
                </div>
            </main>
        </div>
        
        {/* Chat Panel */}
        <div className={`flex-shrink-0 h-full transition-all duration-300 ease-in-out ${isChatPanelOpen ? 'w-full max-w-md p-2' : 'w-0'}`} style={{ overflow: isChatPanelOpen ? 'visible' : 'hidden' }}>
            {isChatPanelOpen && (
                 <ChatPanel
                    isOpen={isChatPanelOpen}
                    onClose={() => setIsChatPanelOpen(false)}
                    initialInsights={analysis.insights}
                    suggestedQuestions={analysis.suggestedQuestions}
                    chatHistory={chatHistory}
                    isLoading={isLoading}
                    onSendMessage={onSendMessage}
                    onStopGeneration={onStopGeneration}
                    chartTemplates={chartTemplates}
                    onSaveChartTemplate={handleSaveChartTemplate}
                />
            )}
        </div>

        <ExplainSheetModal
            isOpen={props.isExplainSheetModalOpen}
            onClose={() => props.setIsExplainSheetModalOpen(false)}
            isLoading={isExplanationLoading}
            content={explanationText}
        />
    </div>
  );
};

export default AnalysisView;
