import React, { useState } from 'react';
import type { CustomView } from '../types';
import SpreadsheetModal from './SpreadsheetModal';

interface CustomViewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customViews: CustomView[];
  onSave: (name: string) => void;
  onLoad: (view: CustomView) => void;
  onDelete: (name: string) => void;
}

const CustomViewsModal: React.FC<CustomViewsModalProps> = ({ isOpen, onClose, customViews, onSave, onLoad, onDelete }) => {
    const [viewName, setViewName] = useState('');
    const [error, setError] = useState('');

    const handleSave = () => {
        setError('');
        if (!viewName.trim()) {
            setError('View name cannot be empty.');
            return;
        }
        if (customViews.some(v => v.name.toLowerCase() === viewName.trim().toLowerCase())) {
            setError('A view with this name already exists.');
            return;
        }
        onSave(viewName.trim());
        setViewName('');
    };

    return (
        <SpreadsheetModal isOpen={isOpen} onClose={onClose} title="Custom Views">
            <div className="flex flex-col h-full">
                <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                    <p className="text-sm text-gray-400">Save and load different filter configurations.</p>
                    <div className="space-y-2">
                        {customViews.length > 0 ? customViews.map(view => (
                            <div key={view.name} className="flex justify-between items-center bg-[#2A2A2A] p-3 rounded-md">
                                <p className="font-semibold text-white">{view.name}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => onLoad(view)} className="toolbar-btn text-xs">Load</button>
                                    <button onClick={() => onDelete(view.name)} className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        )) : <p className="text-center text-gray-500">No custom views saved.</p>}
                    </div>
                     <div className="border-t border-[#333] pt-4">
                        <h3 className="text-lg font-lora mb-2">Save Current View</h3>
                        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
                        <div className="flex gap-2">
                            <input type="text" value={viewName} onChange={e => setViewName(e.target.value)} placeholder="Enter a name for the current view" className="modal-input flex-grow" />
                            <button onClick={handleSave} className="action-btn">Save</button>
                        </div>
                     </div>
                </div>
                 <footer className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t border-[#333]">
                    <button onClick={onClose} className="cancel-btn">Close</button>
                </footer>
            </div>
        </SpreadsheetModal>
    );
};
export default CustomViewsModal;
