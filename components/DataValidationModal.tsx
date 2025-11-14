import React, { useState, useEffect } from 'react';
import type { ValidationRule } from '../types';
import SpreadsheetModal from './SpreadsheetModal';

interface DataValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (rule: ValidationRule) => void;
  onRemove: () => void;
  existingRule?: ValidationRule | null;
}

const DataValidationModal: React.FC<DataValidationModalProps> = ({ isOpen, onClose, onApply, onRemove, existingRule }) => {
  const [ruleType, setRuleType] = useState<ValidationRule['type']>('list');
  const [allowBlank, setAllowBlank] = useState(true);

  // Number state
  const [numCriteria, setNumCriteria] = useState<ValidationRule['criteria']>('gt');
  const [numValue1, setNumValue1] = useState('');
  const [numValue2, setNumValue2] = useState('');

  // Text state
  const [textCriteria, setTextCriteria] = useState<ValidationRule['textCriteria']>('contains');
  const [textValue, setTextValue] = useState('');

  // List state
  const [listValue, setListValue] = useState('');

  useEffect(() => {
    if (existingRule) {
        setRuleType(existingRule.type);
        setAllowBlank(existingRule.allowBlank);
        if (existingRule.type === 'number') {
            setNumCriteria(existingRule.criteria);
            setNumValue1(String(existingRule.value1 ?? ''));
            setNumValue2(String(existingRule.value2 ?? ''));
        } else if (existingRule.type === 'text') {
            setTextCriteria(existingRule.textCriteria);
            setTextValue(existingRule.textValue ?? '');
        } else if (existingRule.type === 'list') {
            setListValue((existingRule.listValues ?? []).join(', '));
        }
    } else {
        // Reset to default
        setRuleType('list');
        setAllowBlank(true);
        setNumCriteria('gt');
        setNumValue1('');
        setNumValue2('');
        setTextCriteria('contains');
        setTextValue('');
        setListValue('');
    }
  }, [existingRule, isOpen]);

  const handleApply = () => {
    let rule: ValidationRule = { type: ruleType, allowBlank };
    switch (ruleType) {
      case 'number':
        if (numValue1 === '') {
            alert('Please enter a value.');
            return;
        }
        if (numCriteria === 'between' && numValue2 === '') {
            alert('Please enter a second value for the "between" criteria.');
            return;
        }
        rule = {
          ...rule,
          criteria: numCriteria,
          value1: parseFloat(numValue1),
          ...(numCriteria === 'between' && { value2: parseFloat(numValue2) }),
        };
        break;
      case 'text':
        rule = { ...rule, textCriteria, textValue };
        break;
      case 'date':
        // Date validation is simpler, no extra values needed for this implementation
        break;
      case 'list':
         const listValues = listValue.split(',').map(item => item.trim()).filter(Boolean);
         if (listValues.length === 0) {
            alert('Please provide a comma-separated list of values.');
            return;
         }
        rule = { ...rule, listValues };
        break;
    }
    onApply(rule);
  };

  const renderCriteria = () => {
    switch (ruleType) {
      case 'number':
        return (
          <>
            <select value={numCriteria} onChange={e => setNumCriteria(e.target.value as ValidationRule['criteria'])} className="modal-input mb-2">
              <option value="gt">greater than</option>
              <option value="lt">less than</option>
              <option value="between">between</option>
              <option value="eq">equal to</option>
              <option value="neq">not equal to</option>
            </select>
            <input type="number" value={numValue1} onChange={e => setNumValue1(e.target.value)} placeholder="Value" className="modal-input mb-2"/>
            {numCriteria === 'between' && (
              <input type="number" value={numValue2} onChange={e => setNumValue2(e.target.value)} placeholder="And" className="modal-input"/>
            )}
          </>
        );
      case 'text':
         return (
          <>
            <select value={textCriteria} onChange={e => setTextCriteria(e.target.value as ValidationRule['textCriteria'])} className="modal-input mb-2">
                <option value="contains">contains</option>
                <option value="not_contains">does not contain</option>
                <option value="email">is a valid email</option>
                <option value="url">is a valid URL</option>
            </select>
            {(textCriteria === 'contains' || textCriteria === 'not_contains') && (
                <input type="text" value={textValue} onChange={e => setTextValue(e.target.value)} placeholder="Text" className="modal-input"/>
            )}
          </>
         );
      case 'date':
        return <p className="text-sm text-gray-400">Cell must contain a valid date format (e.g., YYYY-MM-DD).</p>;
      case 'list':
        return <textarea value={listValue} onChange={e => setListValue(e.target.value)} placeholder="Enter items, separated by a comma" className="modal-input h-24"/>;
      default:
        return null;
    }
  };

  return (
    <SpreadsheetModal isOpen={isOpen} onClose={onClose} title="Data Validation">
        <div className="flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Criteria</label>
                <select value={ruleType} onChange={e => setRuleType(e.target.value as ValidationRule['type'])} className="modal-input">
                  <option value="list">List of items</option>
                  <option value="number">Number</option>
                  <option value="text">Text</option>
                  <option value="date">Date</option>
                </select>
              </div>
              <div>
                {renderCriteria()}
              </div>
              <div className="flex items-center">
                <input id="allowBlank" type="checkbox" checked={allowBlank} onChange={e => setAllowBlank(e.target.checked)} className="h-4 w-4 rounded border-gray-500 bg-[#2A2A2A] text-[#800020] focus:ring-[#800020]"/>
                <label htmlFor="allowBlank" className="ml-2 block text-sm text-gray-300">Allow blank cells</label>
              </div>
            </div>
            <footer className="flex justify-between items-center pt-4 mt-4 border-t border-[#333]">
              <button onClick={onRemove} className="destructive-btn">
                Remove Validation
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="cancel-btn">
                  Cancel
                </button>
                <button onClick={handleApply} className="action-btn">
                  Save
                </button>
              </div>
            </footer>
        </div>
    </SpreadsheetModal>
  );
};

export default DataValidationModal;