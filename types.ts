export interface Chart {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'combo';
  data: Record<string, string | number>[];
  dataKeys: string[];
  templateOptions?: any;
  // For combo charts
  datasetTypes?: { [key: string]: 'bar' | 'line' }; 
  secondaryAxisKeys?: string[];
  trendlineKeys?: string[];
}

export interface InitialAnalysisResponse {
  cleanedData: Record<string, string | number>[];
  insights: string;
  suggestedQuestions: string[];
}

export interface QueryResponse {
  answer: string;
  chart?: Chart;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
    name: string;
    args: Record<string, any>;
    id: string;
}

export interface ChatMessage {
    role: 'user' | 'model' | 'tool';
    parts: { text: string }[] | { functionResponse: any }[];
    chart?: Chart;
    toolCalls?: ToolCall[];
    query?: string; // Original user query for tool calls
}

export interface ValidationRule {
  type: 'number' | 'text' | 'date' | 'list';
  allowBlank: boolean;
  // For number
  criteria?: 'gt' | 'lt' | 'between' | 'eq' | 'neq';
  value1?: number;
  value2?: number; // For 'between'
  // For text
  textCriteria?: 'contains' | 'not_contains' | 'email' | 'url';
  textValue?: string;
  // For list
  listValues?: string[];
}

export interface FormattingRule {
  range: { minRow: number; maxRow: number; minCol: number; maxCol: number };
  type: 'gt' | 'lt' | 'eq' | 'neq' | 'between' | 'text_contains' | 'text_not_contains' | 'color_scale';
  value1?: string | number;
  value2?: string | number; // For between or color scale
  style: {
    backgroundColor: string;
    color?: string;
  };
}

export interface PivotTableConfig {
  rows: string[];
  columns?: string[];
  values: {
    field: string;
    aggregate: 'SUM' | 'COUNT' | 'AVERAGE' | 'MIN' | 'MAX';
  };
}

// --- New Types for Advanced Features ---

export interface SlicerConfig {
  column: string;
  activeFilters: Set<string | number>;
}

export interface SparklineConfig {
  sourceRange: { minRow: number; maxRow: number; minCol: number; maxCol: number };
  type: 'line' | 'bar';
}

export interface NamedRange {
  name: string;
  range: { minRow: number; maxRow: number; minCol: number; maxCol: number };
  isDynamic: boolean;
}

export interface ChartTemplate {
  name: string;
  options: any; // Chart.js options object
}

export interface Macro {
    name: string;
    description: string;
    actions: ToolCall[];
}

export interface CustomFunction {
    name: string;
    parameters: string[];
    logic: string;
}

export interface TransformedDataResponse {
    headers: string[];
    rows: (string | number)[][];
    summary: string;
}

export interface ConversationalGoalSeekResponse {
    cellToChange: {
        rowIndex: number;
        columnHeader: string;
    };
    newValue: number;
    reasoning: string;
}

export interface MultiSortConfig {
    column: string;
    order: 'ASC' | 'DESC';
}

export interface NamedFormula {
    name: string;
    formula: string;
    description?: string;
}

export interface CustomView {
    name: string;
    slicers: SlicerConfig[];
    // Can be extended to store sort order, column visibility, etc.
}

export interface WhatIfDataTable {
    rowInput: { header: string, values: (string|number)[] };
    colInput?: { header: string, values: (string|number)[] };
    formulaCell: { row: number, col: number };
}