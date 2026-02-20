'use client';

import { useState, useEffect, useRef } from 'react';
import { LegendPanel } from './LegendPanel';

export function FullscreenTerminal() {
  const [showCursor, setShowCursor] = useState(true);
  const [currentInput, setCurrentInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    // Focus on mount
    if (terminalRef.current) {
      terminalRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentInput.trim()) {
        processCommand(currentInput.trim());
      } else {
        setTerminalHistory(prev => [...prev, '$']);
      }
      setCurrentInput('');
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      setCurrentInput(prev => prev.slice(0, -1));
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setCurrentInput(prev => prev + e.key);
    }
  };

  const processCommand = (command: string) => {
    const newHistory = [...terminalHistory, `$ ${command}`];
    
    // Add command output based on what was entered
    switch (command.toLowerCase()) {
      case 'whoami':
        newHistory.push('Flynn');
        break;
      case 'uname -a':
        newHistory.push('SolarOS 4.0.1 Generic_50823-02 sun4m i386');
        newHistory.push('Unknown.Unknown');
        break;
      case 'login backdoor':
        newHistory.push('No home directory specified in password file!');
        newHistory.push('Logging in with home=/');
        break;
      case '# bin/history':
        newHistory.push('  488  cd /opt/LLL/controller/laser/');
        newHistory.push('  489  vi LLLSDLaserControl.c');
        newHistory.push('  490  make');
        newHistory.push('  491  make install');
        newHistory.push('  492  ./sanity_check');
        newHistory.push('  493  ./configure -o test.cfs');
        newHistory.push('  494  vi test.cfs');
        newHistory.push('  495  vi ~/last_will_and_testament.txt');
        newHistory.push('  496  cat /proc/machinfo');
        newHistory.push('  497  ps -e -x -u');
        newHistory.push('  498  kill 2007');
        newHistory.push('  499  kill 2208');
        newHistory.push('  500  ps -e -x -u');
        newHistory.push('  501  cd /opt/LLL/run/ok');
        newHistory.push('  502  LLLSDLaserControl -ok 1');
        break;
      case 'access':
        newHistory.push('ACCESS GRANTED. ENTERING THE GRID...');
        // TODO: Navigate to portfolio
        break;
      case 'clear':
        setTerminalHistory([]);
        return;
      case 'help':
        newHistory.push('Available commands:');
        newHistory.push('  whoami         - Display current user');
        newHistory.push('  uname -a       - System information');
        newHistory.push('  login backdoor - Access backdoor');
        newHistory.push('  # bin/history  - View command history');
        newHistory.push('  access         - Enter the website');
        newHistory.push('  clear          - Clear terminal screen');
        newHistory.push('  help           - Show this help message');
        break;
      default:
        newHistory.push(`Command not found: ${command}`);
        newHistory.push('Type "help" for available commands');
        break;
    }
    
    newHistory.push(''); // Add blank line
    setTerminalHistory(newHistory);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#000000' }}>
      {/* Legend Panel */}
      <div className="absolute top-24 right-8 z-10 w-80">
        <LegendPanel />
      </div>
      
      {/* Terminal Window */}
      <div className="relative w-full h-full flex flex-col">
        {/* Window Title Bar */}
        <div 
          className="flex items-center justify-between px-6 py-3"
          style={{ 
            background: '#0a0a0a',
            borderBottom: '1px solid #1a1a1a',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f56' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#ffbd2e' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#27c93f' }} />
            </div>
          </div>
          <span 
            className="absolute left-1/2 -translate-x-1/2"
            style={{ 
              color: '#7dd3fc',
              fontFamily: 'VT323, monospace',
              fontSize: '20px',
            }}
          >
            Command Prompt
          </span>
        </div>
        
        {/* Menu Bar */}
        <div 
          className="flex items-center justify-between px-6 py-2"
          style={{ 
            background: '#0a0a0a',
            borderBottom: '1px solid #1a1a1a',
          }}
        >
          {['File', 'Edit', 'View', 'Terminal', 'Tabs', 'Help'].map((item) => (
            <button
              key={item}
              className="hover:opacity-80 transition-opacity"
              style={{ 
                color: '#7dd3fc',
                fontFamily: 'VT323, monospace',
                fontSize: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {item}
            </button>
          ))}
        </div>
        
        {/* Terminal Content */}
        <div 
          ref={terminalRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="flex-1 overflow-auto p-8 outline-none"
          style={{ 
            fontFamily: 'VT323, monospace',
            fontSize: '24px',
            lineHeight: '1.4',
          }}
        >
          <div className="max-w-full">
            {terminalHistory.map((line, index) => (
              <div
                key={index}
                style={{
                  color: '#7dd3fc',
                  whiteSpace: 'pre',
                }}
              >
                {line}
              </div>
            ))}
            <div
              style={{
                color: '#7dd3fc',
                whiteSpace: 'pre',
              }}
            >
              $ {currentInput}{showCursor && '█'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
