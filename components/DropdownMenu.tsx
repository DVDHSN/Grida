import React, { useState, useRef, useEffect } from 'react';

interface MenuItem {
  label: string;
  action: () => void;
  shortcut?: string;
}

interface DropdownMenuProps {
  title: string;
  items: MenuItem[];
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ title, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="toolbar-btn">
        {title}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-[#2A2A2A] border border-[#444] rounded-md shadow-lg z-50 animate-scale-in" style={{ animationDuration: '0.15s' }}>
          <ul className="py-1">
            {items.map((item, index) => (
              <li key={index}>
                <button
                  onClick={() => handleItemClick(item.action)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#3A3A3A] flex justify-between items-center"
                >
                  <span>{item.label}</span>
                  {item.shortcut && <span className="text-xs text-gray-500">{item.shortcut}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
