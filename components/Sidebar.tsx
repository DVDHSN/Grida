import React from 'react';

interface SidebarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ icon, label, onClick, isActive }) => (
    <div className="relative group">
        <button
            onClick={onClick}
            title={label}
            className={`relative w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-200 ${
                isActive
                    ? 'sidebar-icon-active'
                    : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
            }`}
        >
            {icon}
        </button>
        <div className="sidebar-tooltip absolute left-full ml-3 w-max px-2 py-1 bg-black text-white text-xs rounded-md shadow-lg pointer-events-none">
            {label}
        </div>
    </div>
);

interface SidebarProps {
  isChatOpen: boolean;
  onToggleChat: () => void;
  onExplainSheet: () => void;
  onOpenCharts: () => void;
  onOpenPivot: () => void;
  onOpenTransform: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    isChatOpen,
    onToggleChat,
    onExplainSheet,
    onOpenCharts,
    onOpenPivot,
    onOpenTransform
}) => {
    return (
        <nav className="flex-shrink-0 w-[60px] bg-[#1e1e1e] border-r border-[#333] flex flex-col items-center py-4 gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#800020] to-[#60233D] flex items-center justify-center font-lora text-2xl font-bold text-white mb-4">
                G
            </div>

            <SidebarButton
                label="Copilot"
                isActive={isChatOpen}
                onClick={onToggleChat}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
            />
            <SidebarButton
                label="Explain Sheet"
                onClick={onExplainSheet}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
            />
            
            <div className="w-8 border-t border-[#333] my-2" />

            <SidebarButton
                label="Insert Chart"
                onClick={onOpenCharts}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>}
            />
            <SidebarButton
                label="Pivot Table"
                onClick={onOpenPivot}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 14v6m-3-3h6M3 10h2a2 2 0 012 2v6a2 2 0 01-2 2H3a2 2 0 01-2-2v-6a2 2 0 012-2zM3 4h6a2 2 0 012 2v2a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2z" /></svg>}
            />
            <SidebarButton
                label="Transform Data"
                onClick={onOpenTransform}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>}
            />
        </nav>
    );
};

export default Sidebar;