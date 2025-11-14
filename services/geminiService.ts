import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { InitialAnalysisResponse, QueryResponse, Chart, ToolCall, TransformedDataResponse, PivotTableConfig, FormattingRule, ConversationalGoalSeekResponse, MultiSortConfig } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Tool Definitions for AI ---
const findAndReplaceDeclaration = {
  name: "findAndReplace",
  description: "Find and replace values within specific columns of the dataset.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      findValue: {
        type: Type.STRING,
        description: "The exact string or number to search for in the cells.",
      },
      replaceValue: {
        type: Type.STRING,
        description: "The new string or number to replace the found value with.",
      },
      columns: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "An array of column headers to perform the operation on. If empty, searches all columns.",
      },
    },
    required: ["findValue", "replaceValue"],
  },
};

const updateRowsDeclaration = {
    name: "updateRows",
    description: "Update the values of specific cells based on a set of conditions. Use this for complex updates that find/replace cannot handle.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            updates: {
                type: Type.ARRAY,
                description: "An array of update objects. Each object specifies a row index, a column header, and the new value for that cell.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        rowIndex: { type: Type.NUMBER, description: "The 0-based index of the row to update." },
                        column: { type: Type.STRING, description: "The header of the column to update." },
                        newValue: { type: Type.STRING, description: "The new value to set for the cell." }
                    },
                    required: ["rowIndex", "column", "newValue"]
                }
            }
        },
        required: ["updates"]
    }
};

const addRowDeclaration = {
    name: "addRow",
    description: "Adds a new row to the end of the dataset.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            rowData: {
                type: Type.OBJECT,
                description: "An object representing the new row, with keys as column headers and values as cell content. All columns must be provided.",
            }
        },
        required: ["rowData"],
    }
};

const deleteRowsDeclaration = {
    name: "deleteRows",
    description: "Deletes one or more rows from the dataset based on their 0-based index.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            rowIndices: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER },
                description: "An array of 0-based row indices to delete.",
            }
        },
        required: ["rowIndices"],
    }
};

const addColumnDeclaration = {
    name: "addColumn",
    description: "Adds a new column to the dataset.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            columnName: {
                type: Type.STRING,
                description: "The name of the new column header.",
            },
            defaultValue: {
                type: Type.STRING,
                description: "The default value to fill for all rows in this new column. Defaults to an empty string.",
            }
        },
        required: ["columnName"],
    }
};

const deleteColumnDeclaration = {
    name: "deleteColumn",
    description: "Deletes a column from the dataset.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            columnName: {
                type: Type.STRING,
                description: "The header name of the column to delete.",
            }
        },
        required: ["columnName"],
    }
};

const sortDataDeclaration = {
    name: "sortData",
    description: "Sorts the entire dataset based on a specific column.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            sortByColumn: {
                type: Type.STRING,
                description: "The header name of the column to sort by.",
            },
            order: {
                type: Type.STRING,
                enum: ["ASC", "DESC"],
                description: "The sort order: 'ASC' for ascending, 'DESC' for descending.",
            }
        },
        required: ["sortByColumn", "order"],
    }
};

const sortDataMultiLevelDeclaration = {
    name: "sortDataMultiLevel",
    description: "Sorts the dataset by multiple columns with specified priorities.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            criteria: {
                type: Type.ARRAY,
                description: "An array of sorting criteria objects, applied in order.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        column: { type: Type.STRING, description: "The column header to sort by." },
                        order: { type: Type.STRING, enum: ["ASC", "DESC"], description: "Sort order: 'ASC' or 'DESC'." }
                    },
                    required: ["column", "order"]
                }
            }
        },
        required: ["criteria"]
    }
};


const applyFilterDeclaration = {
    name: "applyFilter",
    description: "Filters the dataset to show or hide rows based on conditions.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            column: { type: Type.STRING, description: "The column header to filter on." },
            values: { type: Type.ARRAY, items: {}, description: "An array of values to match against." },
            keep: { type: Type.BOOLEAN, description: "If true, keeps rows matching 'values'. If false, hides rows matching 'values'." },
        },
        required: ['column', 'values', 'keep']
    }
};

// --- NEW TOOL DECLARATIONS ---
const applyNumberFormattingDeclaration = {
  name: "applyNumberFormatting",
  description: "Applies number formatting (e.g., currency) to specified columns. This is much faster than using transformData for simple formatting.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      columns: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "An array of column headers to perform the formatting on.",
      },
      format: {
        type: Type.STRING,
        enum: ["CURRENCY"],
        description: "The number format to apply. 'CURRENCY' prepends a '$' sign and adds commas."
      }
    },
    required: ["columns", "format"],
  },
};

const applyDataValidationDeclaration = {
    name: "applyDataValidation",
    description: "Applies data validation rules to a specified cell range.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            range: { type: Type.STRING, description: "The cell range in A1 notation (e.g., 'B2:B10')." },
            rule: {
                type: Type.OBJECT,
                description: "The validation rule object.",
                properties: {
                    type: { type: Type.STRING, enum: ['number', 'text', 'date', 'list'] },
                    allowBlank: { type: Type.BOOLEAN },
                    criteria: { type: Type.STRING, enum: ['gt', 'lt', 'between', 'eq', 'neq'], nullable: true },
                    value1: { nullable: true },
                    value2: { nullable: true },
                    textCriteria: { type: Type.STRING, enum: ['contains', 'not_contains', 'email', 'url'], nullable: true },
                    textValue: { type: Type.STRING, nullable: true },
                    listValues: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }
                },
                required: ['type', 'allowBlank']
            }
        },
        required: ['range', 'rule']
    }
};

const applyConditionalFormattingDeclaration = {
    name: "applyConditionalFormatting",
    description: "Applies conditional formatting to a cell range based on a rule.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            range: { type: Type.STRING, description: "The cell range in A1 notation (e.g., 'C2:C10')." },
            rule: {
                type: Type.OBJECT,
                description: "The formatting rule object.",
                properties: {
                    type: { type: Type.STRING, enum: ['gt', 'lt', 'eq', 'neq', 'between', 'text_contains', 'text_not_contains'] },
                    value1: { description: "Primary comparison value." },
                    value2: { description: "Secondary value for 'between'.", nullable: true },
                    style: {
                        type: Type.OBJECT,
                        properties: {
                            backgroundColor: { type: Type.STRING, description: "Hex code for background color (e.g., '#4d0013')." },
                            color: { type: Type.STRING, description: "Hex code for text color.", nullable: true }
                        },
                        required: ['backgroundColor']
                    }
                },
                required: ['type', 'style']
            }
        },
        required: ['range', 'rule']
    }
};

const createPivotTableDeclaration = {
    name: "createPivotTable",
    description: "Creates and displays a pivot table based on the provided configuration.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            config: {
                type: Type.OBJECT,
                properties: {
                    rows: { type: Type.ARRAY, items: { type: Type.STRING } },
                    columns: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                    values: {
                        type: Type.OBJECT,
                        properties: {
                            field: { type: Type.STRING },
                            aggregate: { type: Type.STRING, enum: ['SUM', 'COUNT', 'AVERAGE', 'MIN', 'MAX'] }
                        },
                        required: ['field', 'aggregate']
                    }
                },
                required: ['rows', 'values']
            }
        },
        required: ['config']
    }
};

const transformDataDeclaration = {
    name: "transformData",
    description: "Performs advanced data cleaning, reshaping, or transformation based on natural language instructions. Replaces the current sheet with the result.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            instructions: { type: Type.STRING, description: "Detailed natural language instructions for the transformation." }
        },
        required: ['instructions']
    }
};

const createNamedRangeDeclaration = {
    name: "createNamedRange",
    description: "Creates a named range for a specified cell selection.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "The name for the range (e.g., 'total_sales')." },
            range: { type: Type.STRING, description: "The cell range in A1 notation (e.g., 'D2:D20')." }
        },
        required: ['name', 'range']
    }
};

const performGoalSeekDeclaration = {
    name: "performGoalSeek",
    description: "Performs a what-if analysis to find the input value needed to achieve a desired goal.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: { type: Type.STRING, description: "The natural language query describing the goal, e.g., 'Set total Sales to 50000 by changing the price in cell B5'." }
        },
        required: ['query']
    }
};

const calculateFormulaDeclaration = {
    name: "calculateFormula",
    description: "Evaluates a natural language formula and places the result(s) in the target cell or range.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            formula: { type: Type.STRING, description: "The natural language formula, e.g., 'Sales * 1.1' or 'SUM of Sales'." },
            targetRange: { type: Type.STRING, description: "The cell or range to place the result in (e.g., 'F2' or 'F2:F20')." }
        },
        required: ['formula', 'targetRange']
    }
};

const setSheetProtectionDeclaration = {
    name: "setSheetProtection",
    description: "Locks or unlocks the entire sheet to prevent manual editing.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            locked: { type: Type.BOOLEAN, description: "Set to 'true' to lock the sheet, 'false' to unlock." }
        },
        required: ['locked']
    }
};

const saveCustomViewDeclaration = {
    name: "saveCustomView",
    description: "Saves the current state of all filters and slicers as a named view.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "The name for the custom view." }
        },
        required: ['name']
    }
};

const loadCustomViewDeclaration = {
    name: "loadCustomView",
    description: "Loads a previously saved custom view, applying its filter and slicer settings.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "The name of the custom view to load." }
        },
        required: ['name']
    }
};

const createNamedFormulaDeclaration = {
    name: "createNamedFormula",
    description: "Creates a reusable formula with a given name that can be referenced later.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "The name for the formula (e.g., 'calculate_tax')." },
            formula: { type: Type.STRING, description: "The formula logic (e.g., '=Sales * 0.08')." },
            description: { type: Type.STRING, description: "An optional description of what the formula does." }
        },
        required: ['name', 'formula']
    }
};


// --- Schemas for AI responses ---
const initialProcessingSchema = {
  type: Type.OBJECT,
  properties: {
    cleanedData: {
      type: Type.OBJECT,
      properties: {
        headers: { type: Type.ARRAY, description: "An array of strings for column headers.", items: { type: Type.STRING } },
        rows: { type: Type.ARRAY, description: "An array of arrays, each inner array is a row.", items: { type: Type.ARRAY, items: {} } }
      },
      required: ['headers', 'rows'],
    },
    insights: { type: Type.STRING, description: "A brief, insightful summary of the data." },
    suggestedQuestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Up to 5 actionable data manipulation or enhancement tasks a user could ask for. If anomalies are found, include suggestions to fix them." },
  },
  required: ["cleanedData", "insights", "suggestedQuestions"],
};

const queryResponseSchema = {
    type: Type.OBJECT,
    properties: {
      answer: { type: Type.STRING, description: "A natural language answer to the user's question." },
      chart: {
        type: Type.OBJECT, nullable: true,
        properties: {
          type: { type: Type.STRING, enum: ["bar", "line", "pie", "area", "scatter", "radar", "combo"] },
          data: {
            type: Type.OBJECT,
            properties: {
               headers: { type: Type.ARRAY, items: { type: Type.STRING } },
               rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: {} } }
            },
            required: ['headers', 'rows']
          },
          datasetTypes: {
            type: Type.ARRAY,
            nullable: true,
            description: "For 'combo' charts, an array of objects mapping data keys to chart types.",
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING, description: "The name of the data key from the headers (e.g., 'Sales')." },
                type: { type: Type.STRING, enum: ['bar', 'line'], description: "The chart type for this key." }
              },
              required: ['key', 'type']
            }
          },
          secondaryAxisKeys: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true, description: "An array of data keys to plot on a secondary Y-axis." },
          trendlineKeys: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true, description: "An array of data keys for which to add a linear trendline." },
        },
        required: ["type", "data"],
      },
    },
    required: ["answer"],
  };

const chartGenerationSchema = {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ["bar", "line", "pie", "area", "scatter", "radar", "combo"], description: "The type of chart to generate." },
      data: {
        type: Type.OBJECT,
        properties: {
           headers: { type: Type.ARRAY, items: { type: Type.STRING }, description: "The headers for the chart data." },
           rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: {} }, description: "The row data for the chart." }
        },
        required: ['headers', 'rows']
      },
      datasetTypes: {
        type: Type.ARRAY,
        nullable: true,
        description: "For 'combo' charts, an array of objects mapping data keys to chart types.",
        items: {
          type: Type.OBJECT,
          properties: {
            key: { type: Type.STRING, description: "The name of the data key from the headers (e.g., 'Sales')." },
            type: { type: Type.STRING, enum: ['bar', 'line'], description: "The chart type for this key." }
          },
          required: ['key', 'type']
        }
      },
      secondaryAxisKeys: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true, description: "An array of data keys to plot on a secondary Y-axis." },
      trendlineKeys: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true, description: "An array of data keys for which to add a linear trendline." },
    },
    required: ["type", "data"],
};

const forecastResponseSchema = {
    type: Type.OBJECT,
    properties: {
        forecastData: {
            type: Type.ARRAY,
            description: "An array of objects, each representing a forecasted data point.",
            items: {
                type: Type.OBJECT,
                properties: {
                    time: { description: "The time period for the forecast (e.g., a date string)." },
                    value: { type: Type.NUMBER, description: "The forecasted numerical value." }
                },
                required: ['time', 'value']
            }
        },
        explanation: {
            type: Type.STRING,
            description: "A brief, human-readable explanation of the forecast methodology and findings."
        }
    },
    required: ["forecastData", "explanation"]
};

const conversationalGoalSeekResponseSchema = {
    type: Type.OBJECT,
    properties: {
        cellToChange: {
            type: Type.OBJECT,
            properties: {
                rowIndex: { type: Type.NUMBER, description: "The 0-based index of the row to change." },
                columnHeader: { type: Type.STRING, description: "The header of the column to change." }
            },
            required: ['rowIndex', 'columnHeader']
        },
        newValue: {
            type: Type.NUMBER,
            description: "The calculated value for the 'by changing' cell."
        },
        reasoning: {
            type: Type.STRING,
            description: "A brief explanation of the result."
        }
    },
    required: ["cellToChange", "newValue", "reasoning"]
};

const formulaEvaluationSchema = {
    type: Type.OBJECT,
    properties: {
        result: {
            description: "The result of the formula. Can be a single value (string or number) or an array of values for array formulas."
        }
    },
    required: ["result"]
}

const dataTransformationSchema = {
    type: Type.OBJECT,
    properties: {
        headers: { type: Type.ARRAY, description: "An array of strings for the new column headers.", items: { type: Type.STRING } },
        rows: { type: Type.ARRAY, description: "An array of arrays, where each inner array is a transformed row.", items: { type: Type.ARRAY, items: {} } },
        summary: { type: Type.STRING, description: "A brief, human-readable summary of the transformations that were applied." }
    },
    required: ["headers", "rows", "summary"]
};

const macroGenerationSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            args: { type: Type.OBJECT }
        },
        required: ["name", "args"]
    }
};

const pivotConfigSchema = {
    type: Type.OBJECT,
    properties: {
        rows: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Column headers to use as rows in the pivot table." },
        columns: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Column headers to use as columns in the pivot table." },
        values: {
            type: Type.OBJECT,
            properties: {
                field: { type: Type.STRING, description: "The column header to use for calculation." },
                aggregate: { type: Type.STRING, enum: ['SUM', 'COUNT', 'AVERAGE', 'MIN', 'MAX'], description: "The aggregation function to use." }
            },
            required: ['field', 'aggregate']
        }
    },
    required: ['rows', 'values']
};

const formattingRuleSchema = {
    type: Type.OBJECT,
    properties: {
        type: { type: Type.STRING, enum: ['gt', 'lt', 'eq', 'neq', 'between', 'text_contains', 'text_not_contains'], description: "The type of comparison to perform." },
        value1: { description: "The primary value for the comparison. Can be a string or a number." },
        value2: { description: "The secondary value, used for 'between' comparisons. Can be a string or a number." },
        style: {
            type: Type.OBJECT,
            properties: {
                backgroundColor: { type: Type.STRING, description: "A hex code for the background color (e.g., '#4d0013')." },
                color: { type: Type.STRING, description: "A hex code for the text color (e.g., '#FFFFFF')." }
            },
            required: ['backgroundColor']
        }
    },
    required: ['type', 'style']
};

interface RawAnalysisResponse {
  cleanedData: { headers: string[]; rows: (string | number)[][]; };
  insights: string;
  suggestedQuestions: string[];
}

interface RawQueryResponse {
    answer: string;
    chart?: {
        type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'combo';
        data: { headers: string[]; rows: (string | number)[][]; };
        datasetTypes?: { key: string; type: 'bar' | 'line' }[];
        secondaryAxisKeys?: string[];
        trendlineKeys?: string[];
    }
}

interface RawChartResponse {
    type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'combo';
    data: { headers: string[]; rows: (string | number)[][]; };
    datasetTypes?: { key: string; type: 'bar' | 'line' }[];
    secondaryAxisKeys?: string[];
    trendlineKeys?: string[];
}

export const processRawData = async (rawText: string, context?: string): Promise<InitialAnalysisResponse> => {
  const contextInstruction = (context && context.trim())
    ? `The user has provided the following instructions on how to handle the data. Prioritize these instructions: "${context}"`
    : "You are an expert data analyst AI.";
  
  const prompt = `${contextInstruction} A user has pasted the following raw data. Your task is to clean, structure, and analyze it.
1. Identify columns and data types.
2. Clean the data: fix typos, standardize formats, remove currency symbols and commas from numbers, handle inconsistencies.
3. Return the cleaned data as a JSON object with "headers" and "rows".
4. Provide a brief, insightful summary of the data and any user instructions.
5. Suggest up to 5 actionable data manipulation or enhancement tasks a user could ask for. If you find anomalies like inconsistent formatting ('USA' vs 'United States') or potential typos, include suggestions to fix them (e.g., "Standardize all country names to 'United States'"). These should be actionable edit requests.
Respond ONLY with a single, valid JSON object that conforms to the provided schema.

Raw Data: \`\`\`${rawText}\`\`\``;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: initialProcessingSchema }
  });
  
  const parsed = JSON.parse(response.text.trim()) as RawAnalysisResponse;
  const { headers, rows } = parsed.cleanedData;
  const transformedCleanedData = rows.map(row => {
    const rowObject: Record<string, string | number> = {};
    headers.forEach((header, index) => { rowObject[header] = row[index]; });
    return rowObject;
  });
  return { cleanedData: transformedCleanedData, insights: parsed.insights, suggestedQuestions: parsed.suggestedQuestions };
};


export const startChatSession = (data: Record<string, any>[]): Chat => {
    const dataSample = JSON.stringify(data.slice(0, 200));
    const headers = data.length > 0 ? Object.keys(data[0]).join(', ') : '';

    const systemInstruction = `You are Grida Copilot, an expert data analyst AI integrated into an interactive spreadsheet application. The user's dataset has headers: [${headers}]. A sample of the data is: ${dataSample}.

Your primary goal is to assist the user by understanding their natural language requests. You MUST infer their intent:

1.  **Data Modification:** If a prompt implies changing the source dataset (e.g., "delete row 5", "sort by sales", "change cell B2 to 'Shipped'"), you MUST use the appropriate tool to perform the action (e.g., \`deleteRows\`, \`sortData\`, \`updateRows\`). For these actions, a simple confirmation message in the 'answer' field is sufficient.

2.  **Data Analysis & Querying:** If a prompt asks a question about the data (e.g., "what are the total sales?", "show me the top 5 products"), you MUST provide a direct, natural language answer in the 'answer' field.
    - If the answer can be visualized, you SHOULD also generate a chart.
    - If answering the question is best done using a tool that presents data in a new way (like \`createPivotTable\`), you MUST call the tool AND ALSO provide a natural language answer summarizing the key findings. For example, for "total sales per region," you would call \`createPivotTable\` and also provide an \`answer\` like "The total sales are: North: $4900, South: $1750, etc."

3.  **Formatting:** For formatting numbers (e.g., adding currency symbols '$' or percentage signs '%'), you MUST use the 'applyNumberFormatting' tool. It is much more efficient than 'transformData' for these tasks.

4.  **Formulas:** If a query starts with '=', treat it as a natural language formula and use the 'calculateFormula' tool.

5.  **Hyperlinks:** To create a hyperlink in a cell, use the 'updateRows' tool and format the newValue as a Markdown link: '[link text](url)'. The sheet will render it automatically.

6.  **Answer Formatting:** When providing a natural language answer in the 'answer' field, you MUST use Markdown for formatting to improve readability. Use headings for titles, bold text for key figures, and lists for multiple points. For example, if asked for average sales, an appropriate response would be '### Average Sales\\n\\nThe average sales amount is **$975**.'

Your responses should be concise and direct. Always respond in the required JSON format.

**Available Tools Reference:**
- \`findAndReplace\`, \`updateRows\`, \`addRow\`, \`deleteRows\`, \`addColumn\`, \`deleteColumn\`, \`sortData\`, \`sortDataMultiLevel\`, \`applyFilter\`, \`transformData\`
- \`applyNumberFormatting\`, \`applyDataValidation\`, \`applyConditionalFormatting\`, \`createPivotTable\`, \`createNamedRange\`, \`calculateFormula\`
- \`performGoalSeek\`, \`setSheetProtection\`, \`createNamedFormula\`, \`saveCustomView\`, \`loadCustomView\``;
    
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
            tools: [{ functionDeclarations: [
                findAndReplaceDeclaration,
                updateRowsDeclaration,
                addRowDeclaration,
                deleteRowsDeclaration,
                addColumnDeclaration,
                deleteColumnDeclaration,
                sortDataDeclaration,
                sortDataMultiLevelDeclaration,
                applyFilterDeclaration,
                applyNumberFormattingDeclaration,
                applyDataValidationDeclaration,
                applyConditionalFormattingDeclaration,
                createPivotTableDeclaration,
                transformDataDeclaration,
                createNamedRangeDeclaration,
                performGoalSeekDeclaration,
                calculateFormulaDeclaration,
                setSheetProtectionDeclaration,
                saveCustomViewDeclaration,
                loadCustomViewDeclaration,
                createNamedFormulaDeclaration
            ] }],
        }
    });
};

export const sendMessageToChat = async (chat: Chat, message: string, data: Record<string, any>[]): Promise<QueryResponse> => {
    // Re-provide data context in the prompt for tool use, since the system prompt might be truncated
    const headers = data.length > 0 ? Object.keys(data[0]).join(', ') : '';
    const dataSample = JSON.stringify(data.slice(0, 200));
    
    const fullMessage = `Context: The dataset has columns: [${headers}]. There are ${data.length} rows. A sample of the data is: ${dataSample}.

User Question: "${message}"

Remember to infer the user's intent (edit vs. query) and use tools accordingly. Identify the correct row indices based on the current data if you need to use tools.`;
    
    const response = await chat.sendMessage({ message: fullMessage });

    const toolCalls: ToolCall[] = [];
    if (response.functionCalls) {
        for(const fc of response.functionCalls) {
            toolCalls.push({ id: fc.id, name: fc.name, args: fc.args });
        }
    }

    // Check for a text/chart part in the response
    const jsonPart = response.text?.trim() ?? "{}";
    let parsed: RawQueryResponse;
    try {
        // The model might return just a tool call with a text confirmation, handle that.
        if (jsonPart.startsWith("{")) {
           parsed = JSON.parse(jsonPart);
        } else {
           parsed = { answer: jsonPart }; // Treat non-JSON as a simple text answer
        }
    } catch (e) {
        // If parsing fails, it's likely just a text response.
        parsed = { answer: jsonPart };
    }
    
    const queryResponse: QueryResponse = { answer: parsed.answer || "Performing the requested action...", toolCalls: toolCalls.length > 0 ? toolCalls : undefined };

    if (parsed.chart && parsed.chart.data) {
        const { headers, rows } = parsed.chart.data;
        const transformedChartData = rows.map((row: any[]) => {
            const rowObject: Record<string, any> = {};
            headers.forEach((header: string, index: number) => { rowObject[header] = row[index]; });
            return rowObject;
        });

        let datasetTypesMap: { [key: string]: 'bar' | 'line' } | undefined = undefined;
        if (parsed.chart.datasetTypes && Array.isArray(parsed.chart.datasetTypes)) {
            datasetTypesMap = parsed.chart.datasetTypes.reduce((acc, item) => {
                if (item.key && item.type) {
                    acc[item.key] = item.type;
                }
                return acc;
            }, {} as { [key: string]: 'bar' | 'line' });
        }

        queryResponse.chart = { 
            type: parsed.chart.type, 
            data: transformedChartData, 
            dataKeys: headers.slice(1),
            datasetTypes: datasetTypesMap,
            secondaryAxisKeys: parsed.chart.secondaryAxisKeys,
            trendlineKeys: parsed.chart.trendlineKeys
        };
    }
    
    return queryResponse;
};

export const getChartForData = async (data: Record<string, any>[], chartType: string = 'auto'): Promise<Chart | null> => {
    const dataSample = JSON.stringify(data.slice(0, 50)); // Send up to 50 rows
    const headers = data.length > 0 ? Object.keys(data[0]).join(', ') : '';

    const basePrompt = `You are a data visualization expert. Based on the following data, generate the most appropriate chart.
- The data has headers: [${headers}].
- Data sample: ${dataSample}`;

    const typeInstruction = chartType === 'auto'
      ? "- Choose the best chart type from: 'bar', 'line', 'pie', 'area', 'scatter', 'radar', or 'combo'."
      : `- The user has requested a '${chartType}' chart. Generate this specific chart type. If the data is not suitable, do your best to aggregate or structure it appropriately.`;
      
    const prompt = `${basePrompt}
${typeInstruction}
- For 'scatter' charts, the data must have exactly three headers in the output: a label, an x-axis value, and a y-axis value.
- For 'combo' charts, you must specify the 'datasetTypes' property.
- The entire response must be a single JSON object that conforms to the provided schema. Do not include any other text.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: chartGenerationSchema }
        });

        const parsed = JSON.parse(response.text.trim()) as RawChartResponse;
        
        const { headers, rows } = parsed.data;
        const transformedChartData = rows.map((row: any[]) => {
            const rowObject: Record<string, any> = {};
            headers.forEach((header: string, index: number) => { rowObject[header] = row[index]; });
            return rowObject;
        });
        
        let datasetTypesMap: { [key: string]: 'bar' | 'line' } | undefined = undefined;
        if (parsed.datasetTypes && Array.isArray(parsed.datasetTypes)) {
            datasetTypesMap = parsed.datasetTypes.reduce((acc, item) => {
                if (item.key && item.type) {
                    acc[item.key] = item.type;
                }
                return acc;
            }, {} as { [key: string]: 'bar' | 'line' });
        }

        return { 
            type: parsed.type, 
            data: transformedChartData, 
            dataKeys: headers.slice(1),
            datasetTypes: datasetTypesMap,
            secondaryAxisKeys: parsed.secondaryAxisKeys,
            trendlineKeys: parsed.trendlineKeys
        };

    } catch (error) {
        console.error("Error generating chart:", error);
        return null;
    }
};

export const getFlashFillSuggestions = async (
    data: Record<string, any>[],
    targetColumnHeader: string,
    exampleRowIndex: number
): Promise<(string | null)[]> => {
    const exampleRow = data[exampleRowIndex];
    // Create a context that doesn't include the target column, to prevent the model from just copying
    const contextData = data.slice(0, 10).map(row => {
        const contextRow = { ...row };
        delete contextRow[targetColumnHeader];
        return contextRow;
    });

    const prompt = `You are a data pattern recognition AI. A user is filling a new column named "${targetColumnHeader}".
Based on the existing data in the row, they have provided an example. Your task is to infer the pattern and apply it to all other rows.

Data Sample (without the column being filled):
${JSON.stringify(contextData, null, 2)}

Example:
For the row with this data: ${JSON.stringify(contextData[exampleRowIndex])}
The user entered this value into the "${targetColumnHeader}" column: "${exampleRow[targetColumnHeader]}"

Infer the transformation pattern from this single example. Now, generate the values for the "${targetColumnHeader}" column for ALL of the original data rows based on this pattern.
If a pattern cannot be determined for a specific row, return null for that row.
The response must be a single, valid JSON array of strings or nulls, with one entry for each row in the original data. The array must have exactly ${data.length} elements.
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { nullable: true } } }
        });
        const parsed = JSON.parse(response.text.trim());
        if (Array.isArray(parsed)) {
            return parsed.map(item => item === null ? null : String(item));
        }
        return Array(data.length).fill(null);
    } catch (e) {
        console.error("Flash Fill generation failed:", e);
        return Array(data.length).fill(null);
    }
};

export const evaluateNaturalFormula = async (
    data: Record<string, any>[],
    formulaString: string
): Promise<{result: string | number | (string|number)[] | null}> => {
    if (data.length === 0) return { result: null };

    const headers = Object.keys(data[0]);
    const dataSample = JSON.stringify(data.slice(0, 30));

    const prompt = `You are a spreadsheet formula expert AI. Given the dataset below, evaluate the user's natural language formula.
The formula is: "${formulaString}"
This formula should be interpreted in the context of the entire dataset. For example, if the formula is "'Sales' * 1.1", you should return an array with the calculation applied to every row in the 'Sales' column.

Dataset Headers: [${headers.join(', ')}]
Number of Rows: ${data.length}
Data Sample: ${dataSample}

Your tasks:
1. Parse the user's natural language formula. It could be a simple calculation, an aggregation (like SUM or AVERAGE), a lookup (like VLOOKUP), or an array formula.
2. Apply the formula to the provided dataset.
3. Return the result. This can be a single value (string or number) for aggregations/lookups, or a JSON array of values for array formulas. The array length must match the dataset row count.
4. Respond with ONLY a single valid JSON object containing a "result" key, conforming to the provided schema. Do not add any extra text or explanations.
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: formulaEvaluationSchema }
        });
        const parsed = JSON.parse(response.text.trim());
        return { result: parsed.result };
    } catch(e) {
        console.error("Formula evaluation failed:", e);
        return { result: "#ERROR" };
    }
};

export const getAuditAnalysis = async (
    data: Record<string, any>[],
    cell: { row: number, col: number }
): Promise<string> => {
     if (data.length === 0 || !data[cell.row]) return "No data to analyze.";

    const headers = Object.keys(data[0]);
    const header = headers[cell.col];
    const value = data[cell.row][header];
    const dataSample = JSON.stringify(data.slice(0, 30));

    const prompt = `You are an expert spreadsheet auditing AI. A user wants to understand a specific cell.
The selected cell is at row index ${cell.row}, in the column "${header}".
The value of this cell is: "${value}".

The full dataset has headers: [${headers.join(', ')}]
Data Sample: ${dataSample}

Your task is to analyze the data and provide a concise, natural language explanation covering two points:
1.  **Precedents**: How is this cell's value likely derived? Does it seem to be a result of a calculation involving other columns in the same row (e.g., 'Price' * 'Quantity')? Is it a summary value?
2.  **Dependents**: Which other cells or overall calculations might be affected if this cell's value changes? (e.g., "Changing this 'Sales' value would affect the total sales calculation.").

Provide a brief, helpful explanation. Use Markdown for formatting if needed.
`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
        return response.text;
    } catch(e) {
        console.error("Audit analysis failed:", e);
        return "Could not analyze the cell at this time.";
    }
};

// --- NEW SERVICE FUNCTIONS ---

export const transformData = async (
    data: Record<string, any>[],
    instructions: string,
    secondaryData?: string,
): Promise<TransformedDataResponse> => {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const dataSample = JSON.stringify(data.slice(0, 20));

    const secondaryDataPrompt = secondaryData
        ? `A second dataset is provided for merging/joining/lookup operations:\n\`\`\`\n${secondaryData}\n\`\`\``
        : "";

    const prompt = `You are a data transformation AI, similar to Power Query.
A user has provided a dataset and a set of natural language instructions to clean, transform, merge, or reshape it.

Original Dataset Headers: [${headers.join(', ')}]
Original Dataset Sample: ${dataSample}

${secondaryDataPrompt}

User Instructions:
"${instructions}"

Your task is to perform the requested transformations and return the ENTIRE new dataset.
The response must be a single, valid JSON object that conforms to the provided schema, containing the new headers, all the new rows, and a summary of the actions you took.
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: dataTransformationSchema }
        });
        return JSON.parse(response.text.trim()) as TransformedDataResponse;
    } catch(e) {
        console.error("Data transformation failed:", e);
        throw new Error("The AI failed to transform the data. Please try rephrasing your instructions.");
    }
};

export const generateMacroScript = async (
    data: Record<string, any>[],
    instructions: string,
): Promise<any[]> => {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const availableTools = [
        findAndReplaceDeclaration, updateRowsDeclaration, addRowDeclaration, deleteRowsDeclaration,
        addColumnDeclaration, deleteColumnDeclaration, sortDataDeclaration
    ].map(t => `- ${t.name}: ${t.description}`).join('\n');

    const prompt = `You are a macro generation AI. A user wants to automate a series of tasks.
Convert their natural language instructions into a sequence of tool calls that can be executed.

Available Tools:
${availableTools}

The user's dataset has these headers: [${headers.join(', ')}]
The dataset has ${data.length} rows.

User's Instructions:
"${instructions}"

Your task is to generate a JSON array of tool call objects based on the instructions.
- You must determine the correct arguments for each tool. For tools like 'updateRows' or 'deleteRows', you must infer the correct row indices based on the data context and the user's request.
- The response MUST be only a single, valid JSON array of objects, where each object has a "name" and "args" property, conforming to the schema.
`;
     try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: macroGenerationSchema }
        });
        return JSON.parse(response.text.trim());
    } catch(e) {
        console.error("Macro generation failed:", e);
        throw new Error("The AI could not generate a macro from your instructions.");
    }
};

export const importFromUrl = async (url: string): Promise<Record<string, any>[]> => {
    const prompt = `A user wants to import tabular data from the following URL: ${url}.
Your task is to act like a web scraper. Use your search tool to access the content of the URL, find the primary table of data, and extract it.
- Clean the data: remove unnecessary symbols, standardize formats.
- Structure the data with headers and rows.
- Return the result as a single JSON object with two keys: "headers" (an array of strings) and "rows" (an array of arrays).
- If no tabular data can be found, return an object with empty "headers" and "rows".

The entire response must be ONLY the JSON object. Do not include any other text or markdown.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        
        // Find JSON in the response text
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON object found in the AI response.");
        
        const parsed = JSON.parse(jsonMatch[0]) as { headers: string[], rows: any[][] };
        if (!parsed.headers || !parsed.rows) throw new Error("Invalid data structure returned.");

        const transformedData = parsed.rows.map(row => {
            const rowObject: Record<string, any> = {};
            parsed.headers.forEach((header, index) => {
                rowObject[header] = row[index];
            });
            return rowObject;
        });
        return transformedData;

    } catch (e) {
        console.error("Import from URL failed:", e);
        throw new Error("Could not import data from the specified URL. It might not contain accessible tabular data.");
    }
};

export const executeCustomFunction = async (
    logic: string,
    args: (string | number)[],
    paramNames: string[]
): Promise<string | number> => {
    const inputs = paramNames.reduce((obj, name, index) => ({...obj, [name]: args[index] }), {});

    const prompt = `You are a custom function evaluator.
A user has defined a function with the following logic: "${logic}".
Execute this logic for the following input values: ${JSON.stringify(inputs)}.
Respond with ONLY the final calculated value. Do not provide any explanation or extra text.
If the calculation is not possible, return "#ERROR".
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text.trim();
    } catch(e) {
        console.error("Custom function execution failed:", e);
        return "#ERROR";
    }
};

export const generatePivotConfig = async (
    data: Record<string, any>[],
    headers: string[],
    promptText: string,
): Promise<PivotTableConfig | null> => {
    const dataSample = JSON.stringify(data.slice(0, 20));
    const prompt = `You are a data analyst AI. A user wants to create a pivot table from their data.
Dataset headers: [${headers.join(', ')}]
Data sample: ${dataSample}

User request: "${promptText}"

Your task is to determine the best configuration for the pivot table based on the user's request.
- Identify which fields should be rows.
- Identify which fields (if any) should be columns.
- Identify which field should be used for the values and which aggregation function ('SUM', 'COUNT', 'AVERAGE', 'MIN', 'MAX') is most appropriate.
- Return a single, valid JSON object conforming to the provided schema.
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: pivotConfigSchema }
        });
        return JSON.parse(response.text.trim()) as PivotTableConfig;
    } catch (e) {
        console.error("Pivot config generation failed:", e);
        return null;
    }
};

export const generateFormattingRule = async (
    promptText: string,
): Promise<Omit<FormattingRule, 'range'> | null> => {
    const prompt = `You are a spreadsheet formatting AI. A user has provided a natural language instruction for a conditional formatting rule.
Instruction: "${promptText}"

Your task is to convert this into a structured rule object.
- Determine the rule type ('gt', 'lt', 'eq', 'neq', 'between', 'text_contains', 'text_not_contains').
- Extract the value(s) for comparison.
- Suggest appropriate styling (a 'backgroundColor' and 'color' in hex format). For highlighting positive things (e.g., high sales), use a green/blue background. For negative things (e.g., low stock), use a red/orange background.
- Return a single, valid JSON object conforming to the provided schema.
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: formattingRuleSchema }
        });
        return JSON.parse(response.text.trim()) as Omit<FormattingRule, 'range'>;
    } catch (e) {
        console.error("Formatting rule generation failed:", e);
        return null;
    }
};

export const performConversationalGoalSeek = async (
    data: Record<string, any>[],
    query: string,
): Promise<ConversationalGoalSeekResponse | null> => {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const dataSample = JSON.stringify(data.slice(0, 20));

    const prompt = `You are an expert financial analyst AI. You must perform a "goal seek" operation based on a user's natural language query.

Dataset headers: [${headers.join(', ')}]
Data sample: ${dataSample}

User's Goal: "${query}"

Your tasks:
1.  Parse the user's query to identify three key things:
    a. The **Target Goal**: The desired final value and the column it applies to (e.g., "total Sales of $50000"). This might be an aggregation like SUM or AVERAGE of a column.
    b. The **Cell to Change**: The specific cell that needs to be adjusted to meet the goal (e.g., "the Price for 'Product X'"). You must identify its row index and column header.
    c. The **Relationship**: Infer the mathematical relationship between the cells (e.g., Sales = Price * Quantity).
2.  Calculate the new value for the "Cell to Change" that will achieve the "Target Goal".
3.  Provide a brief reasoning for your calculation.
4.  Return a single, valid JSON object conforming to the provided schema.
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: conversationalGoalSeekResponseSchema }
        });
        return JSON.parse(response.text.trim()) as ConversationalGoalSeekResponse;
    } catch (e) {
        console.error("Conversational Goal Seek failed:", e);
        return null;
    }
};

export const suggestRangeName = async (
    dataSample: Record<string, any>[],
    headers: string[]
): Promise<string> => {
    const prompt = `You are an expert data analyst AI. A user has selected a range of data and wants a suggested name for it.
Based on the headers and a sample of the data, suggest a concise, descriptive name in snake_case format.
For example, if the data contains sales figures for Quarter 1, 2024, a good name would be 'sales_q1_2024'.

Headers: [${headers.join(', ')}]
Data Sample: ${JSON.stringify(dataSample)}

Respond with ONLY the suggested name. Do not add any explanation or extra text.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim().replace(/\s+/g, '_');
    } catch (e) {
        console.error("Range name suggestion failed:", e);
        return '';
    }
};

// --- NEW ADVANCED FEATURE FUNCTIONS ---

export const explainSheet = async (data: Record<string, any>[]): Promise<string> => {
    const dataSample = JSON.stringify(data.slice(0, 100)); // Send a larger sample
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const prompt = `You are a senior data analyst. A user has requested a comprehensive summary of their spreadsheet.
Analyze the provided dataset and generate a narrative report in Markdown format. The report should be easy to read and insightful.

Dataset Headers: [${headers.join(', ')}]
Number of Rows: ${data.length}
Data Sample: ${dataSample}

Your report should include the following sections:
- **Overall Summary:** A high-level overview of what the data represents.
- **Data Structure:** A description of the columns, their likely data types, and their relationships.
- **Key Metrics & Insights:** Identify and calculate key performance indicators (e.g., total sales, average values, record counts per category). Point out the most significant findings.
- **Trends & Patterns:** Identify any notable trends (e.g., sales increasing over time) or patterns in the data.
- **Potential Anomalies:** Highlight any potential data quality issues, outliers, or inconsistencies that the user might want to investigate.

The response must be only the Markdown report. Do not include any other text or explanations.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
        return response.text;
    } catch (e) {
        console.error("Explain Sheet failed:", e);
        throw new Error("The AI failed to generate an explanation for the sheet.");
    }
};

export interface ForecastResponse {
    forecastData: { time: string; value: number }[];
    explanation: string;
}

export const getForecast = async (
    data: Record<string, any>[],
    timeColumn: string,
    valueColumn: string,
    periods: number
): Promise<ForecastResponse> => {
    const historicalData = data.map(row => ({ time: row[timeColumn], value: row[valueColumn] }));
    const prompt = `You are a forecasting expert. A user wants to predict future values based on historical time-series data.

Historical Data (${timeColumn} | ${valueColumn}):
${JSON.stringify(historicalData.slice(0, 200))}

User Request: Forecast the next ${periods} periods for the "${valueColumn}" column.

Your tasks:
1. Analyze the historical data to identify trends, seasonality, and patterns.
2. Generate a forecast for the specified number of future periods.
3. Provide a brief, human-readable explanation of your methodology and what the forecast indicates.
4. Return a single, valid JSON object conforming to the provided schema. The 'time' in the forecast data should follow the same format as the input data.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: forecastResponseSchema }
        });
        return JSON.parse(response.text.trim()) as ForecastResponse;
    } catch (e) {
        console.error("Forecasting failed:", e);
        throw new Error("The AI failed to generate a forecast.");
    }
};

export const generateTemplate = async (userPrompt: string): Promise<InitialAnalysisResponse> => {
    const prompt = `You are an expert spreadsheet template designer. A user has described the kind of sheet they want to create.
Your task is to generate a complete, ready-to-use spreadsheet structure based on their request.

User Request: "${userPrompt}"

Your instructions:
1.  Determine a logical set of column headers for the request.
2.  Generate 5-10 rows of realistic sample data to demonstrate how the sheet should be used.
3.  Provide a brief, helpful "insights" summary explaining the template's purpose and how to get started.
4.  Suggest 3-5 actionable next steps a user might take with this template (e.g., "Add a new project task", "Sort by due date").
5.  Return the result as a single, valid JSON object conforming to the 'initialProcessingSchema'. This includes 'cleanedData' (with 'headers' and 'rows'), 'insights', and 'suggestedQuestions'.

The entire response must be ONLY the JSON object.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: initialProcessingSchema }
        });
        const parsed = JSON.parse(response.text.trim()) as RawAnalysisResponse;
        const { headers, rows } = parsed.cleanedData;
        const transformedCleanedData = rows.map(row => {
            const rowObject: Record<string, string | number> = {};
            headers.forEach((header, index) => { rowObject[header] = row[index]; });
            return rowObject;
        });
        return { cleanedData: transformedCleanedData, insights: parsed.insights, suggestedQuestions: parsed.suggestedQuestions };
    } catch (e) {
        console.error("Template generation failed:", e);
        throw new Error("The AI failed to generate a template from your description.");
    }
};