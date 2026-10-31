/**
 * mobile-app/src/components/citizen/MessageModal.tsx
 * Quick SMS/Message Modal connecting Citizen to Assigned Ambulance Driver.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageSquare, Send, X, ShieldAlert } from 'lucide-react';

export const MessageModal: React.FC = () => {
  const { messageModalOpen, setMessageModalOpen, assignedAmbulance } = useApp();
  const [messages, setMessages] = useState<string[]>([
    'Citizen: Waiting at building entrance on main road.',
    'Driver: Roger, turning onto Ashram Road now, ETA 4 mins.',
  ]);
  const [inputVal, setInputVal] = useState('');

  if (!messageModalOpen) return null;

  const handleSend = () => {
    if (!inputVal.trim()) return;
    setMessages((prev) => [...prev, `Citizen: ${inputVal.trim()}`]);
    setInputVal('');

    // Simulated driver response after 1s
    setTimeout(() => {
      setMessages((prev) => [...prev, 'Driver: Acknowledged. Siren active, stay in safe location.']);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-neutral-900 text-white border border-neutral-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl flex flex-col h-[460px]">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Dispatch Comms • {assignedAmbulance?.driverName || 'James Harris'}
              </h2>
              <span className="text-[10px] text-emerald-400 font-semibold">
                Simulated Silent In-Band Mesh
              </span>
            </div>
          </div>
          <button
            onClick={() => setMessageModalOpen(false)}
            className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 text-xs">
          {messages.map((m, idx) => {
            const isCitizen = m.startsWith('Citizen:');
            return (
              <div
                key={idx}
                className={`p-2.5 rounded-2xl max-w-[85%] ${
                  isCitizen
                    ? 'ml-auto bg-[#B42318] text-white rounded-br-xs'
                    : 'mr-auto bg-neutral-800 text-neutral-200 rounded-bl-xs'
                }`}
              >
                {m.replace(/^(Citizen:|Driver:)\s*/, '')}
              </div>
            );
          })}
        </div>

        {/* Input Row */}
        <div className="pt-2 border-t border-neutral-800 flex items-center space-x-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type message to driver..."
            className="flex-1 bg-neutral-800 border border-neutral-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
          />
          <button
            onClick={handleSend}
            className="w-8 h-8 rounded-xl bg-[#B42318] text-white flex items-center justify-center active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

