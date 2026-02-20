'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const PHOSPHOR_COLOR = '#6bc4d4';
const PHOSPHOR_DARK = '#2d6b75';
const PHOSPHOR_GLOW = 'rgba(107, 196, 212, 0.4)';

const SUGGESTED_COMMANDS = [
  'whoami',
  'uname -a',
  'login backdoor',
  'bin/history',
  'bin/LLLSDLaserControl -ok 1',
  'access',
  'clear',
  'help',
];

const SEQUENTIAL_SUGGESTIONS = [
  'whoami',
  'uname -a',
  'login backdoor',
  'bin/history',
  'bin/LLLSDLaserControl -ok 1',
];

const OUTPUT_STREAM_DELAY_MS = 90;

const LASER_LOG_LINES = [
  'HV online............................. OK',
  'Analog core memory.................... OK',
  'Booting pattern recognition systems... OK',
  'Waveform support data loaded.......... OK',
  'Optical bus interface................. OK',
  'Cooling manifold status............... NOMINAL',
  'Primary capacitor charge.............. 87%',
  'Secondary capacitor charge............ 91%',
  '',
  'Checking aperture alignment...',
  'Current state: CLOSED',
  'Servo response........................ OK',
  'Actuator voltage...................... 4.98V',
  'Feedback loop calibration............. OK',
];

export function FullscreenTerminal() {
  const [showCursor, setShowCursor] = useState(true);
  const [currentInput, setCurrentInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [isBackdoorLoggedIn, setIsBackdoorLoggedIn] = useState(false);
  const [streamingLogIndex, setStreamingLogIndex] = useState<number | null>(null);
  const [streamingOutput, setStreamingOutput] = useState<{ lines: string[]; index: number } | null>(null);
  const [showApertureDialog, setShowApertureDialog] = useState(false);
  const [apertureSelection, setApertureSelection] = useState<'yes' | 'no'>('yes');
  const [suggestionStep, setSuggestionStep] = useState(0);
  const promptSymbol = isBackdoorLoggedIn ? '#' : '$';
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const apertureDialogRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!showApertureDialog) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [showApertureDialog]);

  useEffect(() => {
    // Auto-scroll to bottom when content updates
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalHistory, currentInput]);

  useEffect(() => {
    if (showApertureDialog && apertureDialogRef.current) {
      apertureDialogRef.current.focus();
    }
  }, [showApertureDialog]);

  useEffect(() => {
    if (!streamingOutput) return;
    const { lines, index } = streamingOutput;
    if (index >= lines.length) {
      setStreamingOutput(null);
      setTerminalHistory(prev => [...prev, '']);
      return;
    }
    const timer = setTimeout(() => {
      setTerminalHistory(prev => [...prev, lines[index]]);
      setStreamingOutput({ lines, index: index + 1 });
    }, OUTPUT_STREAM_DELAY_MS);
    return () => clearTimeout(timer);
  }, [streamingOutput]);

  useEffect(() => {
    if (streamingLogIndex === null) return;
    if (streamingLogIndex >= LASER_LOG_LINES.length) {
      setStreamingLogIndex(null);
      setTerminalHistory(prev => [...prev, '']);
      setShowApertureDialog(true);
      return;
    }
    const timer = setTimeout(() => {
      setTerminalHistory(prev => [...prev, LASER_LOG_LINES[streamingLogIndex]]);
      setStreamingLogIndex(prev => (prev ?? 0) + 1);
    }, 40);
    return () => clearTimeout(timer);
  }, [streamingLogIndex]);

  const handleApertureYes = useCallback(() => {
    setShowApertureDialog(false);
    setTerminalHistory(prev => [...prev, 'Aperture open.', '']);
    router.push('/aperture');
  }, [router]);

  const handleApertureKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setApertureSelection(prev => prev === 'yes' ? 'no' : 'yes');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setShowApertureDialog(false);
      if (apertureSelection === 'yes') {
        handleApertureYes();
      } else {
        setTerminalHistory(prev => [...prev, 'Aperture closed.', '']);
      }
    }
  }, [apertureSelection, handleApertureYes]);

  const getSuggestion = useCallback((input: string) => {
    if (!input) {
      const step = Math.min(suggestionStep, SEQUENTIAL_SUGGESTIONS.length - 1);
      return SEQUENTIAL_SUGGESTIONS[step];
    }
    const lower = input.toLowerCase();
    return SUGGESTED_COMMANDS.find(cmd => cmd.toLowerCase().startsWith(lower)) ?? null;
  }, [suggestionStep]);

  const suggestion = getSuggestion(currentInput);
  const ghostText = suggestion && suggestion.length > currentInput.length
    ? suggestion.slice(currentInput.length)
    : '';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showApertureDialog) {
      handleApertureKeyDown(e);
      return;
    }
    if (e.key === 'Tab' && suggestion && ghostText) {
      e.preventDefault();
      setCurrentInput(suggestion);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentInput.trim()) {
        processCommand(currentInput.trim());
      } else {
        setTerminalHistory(prev => [...prev, promptSymbol]);
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
    const baseHistory = [...terminalHistory, `${promptSymbol} ${command}`];

    const stream = (lines: string[], sideEffects?: () => void) => {
      setTerminalHistory(baseHistory);
      sideEffects?.();
      setStreamingOutput({ lines, index: 0 });
    };

    switch (command.toLowerCase()) {
      case 'whoami':
        stream(['Tomiwa'], () => setSuggestionStep(1));
        return;
      case 'uname -a':
        stream(['SolarOS 4.0.1 Generic_50823-02 sun4m i386', 'Unknown.Unknown'], () => setSuggestionStep(2));
        return;
      case 'login backdoor':
        stream(['No home directory specified in password file!', 'Logging in with home=/'], () => {
          setIsBackdoorLoggedIn(true);
          setSuggestionStep(3);
        });
        return;
      case 'bin/lllsdlasercontrol -ok 1':
        if (isBackdoorLoggedIn) {
          setSuggestionStep(4);
          setTerminalHistory(baseHistory);
          setStreamingLogIndex(0);
        } else {
          stream([`Command not found: bin/LLLSDLaserControl -ok 1`, 'Type "help" for available commands']);
        }
        return;
      case 'bin/history':
        if (isBackdoorLoggedIn) {
          stream([
            '  488  cd /opt/LLL/controller/laser/',
            '  489  vi LLLSDLaserControl.c',
            '  490  make',
            '  491  make install',
            '  492  ./sanity_check',
            '  493  ./configure -o test.cfs',
            '  494  vi test.cfs',
            '  495  vi ~/last_will_and_testament.txt',
            '  496  cat /proc/machinfo',
            '  497  ps -e -x -u',
            '  498  kill 2007',
            '  499  kill 2208',
            '  500  ps -e -x -u',
            '  501  cd /opt/LLL/run/ok',
            '  502  LLLSDLaserControl -ok 1',
          ], () => setSuggestionStep(4));
        } else {
          stream([`Command not found: bin/history`, 'Type "help" for available commands']);
        }
        return;
      case 'access':
        stream(['ACCESS GRANTED. ENTERING THE GRID...']);
        return;
      case 'clear':
        setTerminalHistory([]);
        return;
      case 'help':
        stream([
          'Available commands:',
          '  whoami         - Display current user',
          '  uname -a       - System information',
          '  login backdoor - Access backdoor',
          '  bin/history    - View command history (after login backdoor)',
          '  bin/LLLSDLaserControl -ok 1 - Laser control (after login backdoor)',
          '  access         - Enter the website',
          '  clear          - Clear terminal screen',
          '  help           - Show this help message',
        ]);
        return;
      default:
        stream([`Command not found: ${command}`, 'Type "help" for available commands']);
    }
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{
        background: '#030405',
        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.9)',
      }}
    >
      {/* CRT scanlines overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-20 opacity-[0.06]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 3px)',
        }}
      />
      {/* Aperture Clear Overlay */}
      {showApertureDialog && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
          onClick={() => {}}
        >
          <div
            ref={apertureDialogRef}
            className="flex flex-col overflow-hidden rounded-sm outline-none"
            style={{
              background: '#e6c200',
              boxShadow: '0 0 0 2px #333, 0 8px 32px rgba(0,0,0,0.5)',
              minWidth: 320,
            }}
            onKeyDown={handleApertureKeyDown}
            tabIndex={0}
          >
            {/* Window title bar */}
            <div
              className="flex items-center justify-between px-3 py-1.5"
              style={{
                background: '#d4d4d4',
                borderBottom: '1px solid #999',
                fontFamily: 'VT323, monospace',
                fontSize: '16px',
              }}
            >
              <span style={{ color: '#333' }}>System</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ background: '#ccc' }} />
                <div className="w-3 h-3 rounded-sm" style={{ background: '#ccc' }} />
                <div className="w-3 h-3 rounded-sm" style={{ background: '#e74c3c' }} />
              </div>
            </div>
            {/* Dialog content */}
            <div
              className="p-6 flex flex-col items-center gap-6"
              style={{
                background: '#e6c200',
                fontFamily: 'VT323, monospace',
                fontSize: '24px',
                color: '#1a1a1a',
              }}
            >
              <p>Aperture Clear?</p>
              <div className="flex gap-6">
                <button
                  onClick={() => {
                    setApertureSelection('yes');
                    handleApertureYes();
                  }}
                  className="px-4 py-2 transition-colors"
                  style={{
                    background: apertureSelection === 'yes' ? PHOSPHOR_COLOR : 'transparent',
                    border: '1px solid #333',
                    fontFamily: 'VT323, monospace',
                    fontSize: '22px',
                    cursor: 'pointer',
                    color: '#1a1a1a',
                  }}
                >
                  &lt; Yes &gt;
                </button>
                <button
                  onClick={() => {
                    setApertureSelection('no');
                    setShowApertureDialog(false);
                    setTerminalHistory(prev => [...prev, 'Aperture closed.', '']);
                  }}
                  className="px-4 py-2 transition-colors"
                  style={{
                    background: apertureSelection === 'no' ? PHOSPHOR_COLOR : 'transparent',
                    border: '1px solid #333',
                    fontFamily: 'VT323, monospace',
                    fontSize: '22px',
                    cursor: 'pointer',
                    color: '#1a1a1a',
                  }}
                >
                  &lt; No &gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Window - retro frame */}
      <div
        className="relative w-full h-full flex flex-col border-2"
        style={{
          borderColor: PHOSPHOR_COLOR,
          background: '#000000',
          boxShadow: `0 0 20px ${PHOSPHOR_GLOW}, inset 0 0 60px rgba(0,0,0,0.9)`,
        }}
      >
        {/* Window Title Bar */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{
            background: PHOSPHOR_DARK,
            borderBottom: `1px solid ${PHOSPHOR_COLOR}`,
          }}
        >
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 border" style={{ borderColor: PHOSPHOR_COLOR, background: 'transparent' }} />
            <div className="w-2.5 h-2.5 border" style={{ borderColor: PHOSPHOR_COLOR, background: 'transparent' }} />
            <div className="w-2.5 h-2.5 border" style={{ borderColor: PHOSPHOR_COLOR, background: 'transparent' }} />
          </div>
          <span
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              color: PHOSPHOR_COLOR,
              fontFamily: 'VT323, monospace',
              fontSize: '22px',
              textShadow: `0 0 8px ${PHOSPHOR_GLOW}`,
            }}
          >
            Command Prompt
          </span>
          <div style={{ width: 36 }} />
        </div>

        {/* Menu Bar */}
        <div
          className="flex items-center gap-6 px-6 py-2"
          style={{
            background: PHOSPHOR_DARK,
            borderBottom: `1px solid ${PHOSPHOR_COLOR}`,
          }}
        >
          {['File', 'Edit', 'View', 'Terminal', 'Tabs', 'Help'].map((item) => (
            <button
              key={item}
              className="hover:opacity-80 transition-opacity"
              style={{
                color: PHOSPHOR_COLOR,
                fontFamily: 'VT323, monospace',
                fontSize: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textShadow: `0 0 6px ${PHOSPHOR_GLOW}`,
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Terminal Content */}
        <div
          ref={terminalRef}
          data-terminal-scroll
          className="flex-1 overflow-auto p-8 outline-none relative cursor-text"
          style={{
            fontFamily: 'VT323, monospace',
            fontSize: '24px',
            lineHeight: 1.4,
            background: '#000000',
            color: PHOSPHOR_COLOR,
          }}
          onClick={() => inputRef.current?.focus()}
        >
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Terminal input"
            onKeyDown={handleKeyDown}
            className="absolute inset-0 w-full opacity-0 cursor-text"
            style={{
              fontFamily: 'inherit',
              fontSize: 'inherit',
            }}
          />
          <style>{`
            [data-terminal-scroll]::-webkit-scrollbar {
              width: 12px;
            }
            [data-terminal-scroll]::-webkit-scrollbar-track {
              background: #0a0a0a;
            }
            [data-terminal-scroll]::-webkit-scrollbar-thumb {
              background: ${PHOSPHOR_DARK};
              border: 1px solid ${PHOSPHOR_COLOR};
            }
            [data-terminal-scroll]::-webkit-scrollbar-thumb:hover {
              background: ${PHOSPHOR_COLOR};
            }
          `}</style>
          <div className="max-w-full">
            {terminalHistory.map((line, index) => (
              <div
                key={index}
                style={{
                  color: PHOSPHOR_COLOR,
                  whiteSpace: 'pre',
                  textShadow: `0 0 4px ${PHOSPHOR_GLOW}`,
                }}
              >
                {line}
              </div>
            ))}
            <div
              style={{
                color: PHOSPHOR_COLOR,
                whiteSpace: 'pre',
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                textShadow: `0 0 4px ${PHOSPHOR_GLOW}`,
              }}
            >
              {promptSymbol} {currentInput}
              <span
                style={{
                  color: 'rgba(107, 196, 212, 0.35)',
                  pointerEvents: 'none',
                }}
              >
                {ghostText}
              </span>
              {showCursor && (
                <span
                  className="inline-block align-middle ml-0.5"
                  style={{
                    width: '1ch',
                    height: '1.2em',
                    background: PHOSPHOR_COLOR,
                    boxShadow: `0 0 6px ${PHOSPHOR_GLOW}`,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Bottom status bar */}
        <div
          className="h-2"
          style={{
            background: PHOSPHOR_DARK,
            borderTop: `1px solid ${PHOSPHOR_COLOR}`,
          }}
        />
      </div>
    </div>
  );
}
