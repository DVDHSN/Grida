// Helper to convert 'A1' to {row: 0, col: 0}
const cellToCoords = (cell: string): {row: number, col: number} | null => {
    const match = cell.match(/^([A-Z]+)(\d+)$/i);
    if (!match) return null;
    const [, colStr, rowStr] = match;
    const col = colStr.toUpperCase().split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
    const row = parseInt(rowStr, 10) - 1;

    if (isNaN(col) || isNaN(row) || row < 0 || col < 0) return null;
    return { row, col };
};

// Main evaluation function
export const evaluateFormula = (
    formula: string,
    data: (string | number)[][],
): string | number => {
    // Expression starts after '='
    let expression = formula.substring(1);

    const cellRegex = /([A-Z]+[0-9]+)/gi;
    let containsRefError = false;
    let refErrorType = '#REF!';

    expression = expression.replace(cellRegex, (match) => {
        const coords = cellToCoords(match);
        if (coords) {
            const { row, col } = coords;
            if (data[row] && data[row][col] !== undefined) {
                const val = data[row][col];
                // If a precedent is an error, propagate it
                if (typeof val === 'string' && val.startsWith('#')) {
                    containsRefError = true;
                    refErrorType = val;
                    return val;
                }
                // Numbers are used directly
                if (typeof val === 'number') {
                    return String(val);
                }
                if (typeof val === 'string') {
                    // Allow empty strings to be treated as 0
                    if (val.trim() === '') return '0';
                    
                    // Attempt to parse formatted numbers (currency, etc.)
                    const cleanedVal = val.replace(/[^0-9.-]+/g,"");
                     if (cleanedVal.trim() === '') {
                        containsRefError = true;
                        refErrorType = '#VALUE!';
                        return '#VALUE!';
                    }
                    const parsedVal = parseFloat(cleanedVal);

                    if (!isNaN(parsedVal)) {
                        return String(parsedVal);
                    } else {
                        // If it's not a parsable number after cleaning, it's a value error
                        containsRefError = true;
                        refErrorType = '#VALUE!';
                        return '#VALUE!';
                    }
                }
                 // Fallback for other types
                containsRefError = true;
                refErrorType = '#VALUE!';
                return '#VALUE!';
            }
        }
        containsRefError = true;
        refErrorType = '#REF!';
        return '#REF!';
    });

    if (containsRefError) {
        return refErrorType;
    }
    
    // Security: Basic check for allowed characters to prevent arbitrary code execution.
    // Allows numbers, decimal points, operators, parentheses, and whitespace.
    const allowedCharsRegex = /^[0-9.+\-*/\s().]+$/;
    if (!allowedCharsRegex.test(expression)) {
        return '#NAME?'; // Error for invalid characters or function names
    }

    try {
        // Using Function constructor is safer than direct eval()
        const result = new Function(`return ${expression}`)();
        if (result === Infinity || result === -Infinity) {
            return '#DIV/0!';
        }
        if (isNaN(result)) {
            return '#VALUE!';
        }
        return typeof result === 'number' ? result : String(result);
    } catch (e) {
        // This can happen for syntax errors, e.g. '=5+'
        return '#ERROR!';
    }
};