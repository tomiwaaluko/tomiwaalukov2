'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';

/* Theme via CSS variables (see globals.css) */
const PHOSPHOR = 'var(--terminal-phosphor)';
const PHOSPHOR_DIM = 'var(--terminal-phosphor-dim)';
const PHOSPHOR_GLOW = 'var(--terminal-phosphor-glow)';
const CHROME_BG = 'var(--terminal-chrome)';
const CHROME_DARK = 'var(--terminal-dark)';

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
        background: 'var(--terminal-bg)',
        fontFamily: 'var(--font-terminal)',
      }}
    >
      {/* Layered atmospheric background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 120% 100% at 50% 20%, rgba(15, 35, 55, 0.6) 0%, transparent 50%),
            radial-gradient(ellipse 80% 60% at 70% 80%, rgba(5, 20, 35, 0.4) 0%, transparent 50%),
            linear-gradient(180deg, var(--terminal-darker) 0%, var(--terminal-bg) 40%, var(--terminal-bg) 100%)
          `,
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)',
        }}
      />
      {/* Film grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* CRT scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.35) 2px, rgba(0,0,0,0.35) 3px)',
          opacity: 0.15,
        }}
      />
      {/* CRT phosphor grid */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(93,217,239,0.015) 1px, rgba(93,217,239,0.015) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(93,217,239,0.012) 1px, rgba(93,217,239,0.012) 2px)
          `,
          backgroundSize: '2px 2px',
        }}
      />
      {/* Aperture Clear Overlay */}
      <AnimatePresence>
        {showApertureDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0, 0, 0, 0.72)' }}
          >
            <motion.div
              ref={apertureDialogRef}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              className="flex flex-col outline-none"
              style={{
                fontFamily: 'var(--font-terminal)',
                minWidth: 520,
                maxWidth: 560,
                width: '45vw',
                position: 'relative',
              }}
              onKeyDown={handleApertureKeyDown}
              tabIndex={0}
            >
              <div
                style={{
                  borderRadius: 6,
                  background: '#b8a830',
                  boxShadow: '0 12px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.2), inset 0 0 80px rgba(0,0,0,0.12)',
                  overflow: 'hidden',
                }}
              >
                <div>
                  {/* Title bar — matches main terminal theme */}
                  <div
                    className="flex items-center justify-between"
                    style={{
                      borderBottom: '2px solid #8a7e45',
                      padding: '3px 8px',
                      background: CHROME_BG,
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                  }}
                >
                  {/* Left window controls */}
                  <div className="flex items-center gap-1">
                    <div style={{
                      width: 12, height: 12,
                      border: `1.5px solid ${PHOSPHOR}`,
                      borderRadius: 1,
                      background: 'transparent',
                    }} />
                    <div style={{
                      width: 12, height: 12,
                      border: `1.5px solid ${PHOSPHOR}`,
                      borderRadius: 1,
                      background: 'transparent',
                    }} />
                  </div>

                  {/* Title with dashed line decoration */}
                  <div
                    className="flex items-center gap-2 flex-1 justify-center"
                    style={{
                      fontSize: 16,
                      fontFamily: 'var(--font-chrome)',
                      color: PHOSPHOR,
                      letterSpacing: '0.5px',
                      textShadow: `0 0 6px ${PHOSPHOR_GLOW}`,
                    }}
                  >
                    <span style={{
                      flex: 1, height: 1,
                      borderBottom: `1px dashed ${PHOSPHOR}`,
                      marginRight: 8,
                      opacity: 0.5,
                    }} />
                    <span>Confirmation Alert</span>
                    <span style={{
                      flex: 1, height: 1,
                      borderBottom: `1px dashed ${PHOSPHOR}`,
                      marginLeft: 8,
                      opacity: 0.5,
                    }} />
                  </div>

                  {/* Right window control */}
                  <div style={{
                    width: 12, height: 12,
                    border: `1.5px solid ${PHOSPHOR}`,
                    borderRadius: 1,
                    background: 'transparent',
                  }} />
                </div>

                {/* Dialog body */}
                <div
                  className="flex flex-col items-center"
                  style={{
                    padding: '20px 48px 18px',
                    background: `
                      radial-gradient(ellipse at center, rgba(200,180,60,0.2) 0%, transparent 70%),
                      linear-gradient(180deg, #c0b030 0%, #a89820 50%, #b0a028 100%)
                    `,
                    position: 'relative',
                  }}
                >
                  {/* Noise/grain texture overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `
                        repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px),
                        repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 3px)
                      `,
                      backgroundSize: '3px 3px, 4px 4px',
                    }}
                  />

                  {/* Question text */}
                  <p style={{
                    fontSize: 30,
                    color: '#2a2508',
                    letterSpacing: '2px',
                    marginBottom: 18,
                    textShadow: '1px 1px 0 rgba(255,255,255,0.15)',
                    position: 'relative',
                  }}>
                    Aperture Clear?
                  </p>

                  {/* Buttons row */}
                    <div className="flex items-center" style={{ gap: 80, position: 'relative' }}>
                    <div
                      onClick={() => {
                        setApertureSelection('yes');
                        handleApertureYes();
                      }}
                      className="flex items-center"
                      style={{
                        fontFamily: 'VT323, monospace',
                        fontSize: 24,
                        cursor: 'pointer',
                        color: '#4a4210',
                        gap: 4,
                      }}
                    >
                      <span>&lt;</span>
                      <span
                        className="transition-colors"
                        style={{
                          background: apertureSelection === 'yes'
                            ? 'linear-gradient(180deg, #5090cc 0%, #3870a8 100%)'
                            : 'transparent',
                          color: apertureSelection === 'yes' ? '#e8e8e8' : '#4a4210',
                          padding: '1px 6px',
                          borderRadius: 2,
                          textDecoration: 'underline',
                          textUnderlineOffset: '3px',
                          textShadow: apertureSelection === 'yes'
                            ? '0 1px 2px rgba(0,0,0,0.4)'
                            : 'none',
                          boxShadow: apertureSelection === 'yes'
                            ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)'
                            : 'none',
                        }}
                      >Yes</span>
                      <span>&gt;</span>
                    </div>
                    <div
                      onClick={() => {
                        setApertureSelection('no');
                        setShowApertureDialog(false);
                        setTerminalHistory(prev => [...prev, 'Aperture closed.', '']);
                      }}
                      className="flex items-center"
                      style={{
                        fontFamily: 'VT323, monospace',
                        fontSize: 24,
                        cursor: 'pointer',
                        color: '#4a4210',
                        gap: 4,
                      }}
                    >
                      <span>&lt;</span>
                      <span
                        className="transition-colors"
                        style={{
                          background: apertureSelection === 'no'
                            ? 'linear-gradient(180deg, #5090cc 0%, #3870a8 100%)'
                            : 'transparent',
                          color: apertureSelection === 'no' ? '#e8e8e8' : '#4a4210',
                          padding: '1px 6px',
                          borderRadius: 2,
                          textDecoration: 'underline',
                          textUnderlineOffset: '3px',
                          textShadow: apertureSelection === 'no'
                            ? '0 1px 2px rgba(0,0,0,0.4)'
                            : 'none',
                          boxShadow: apertureSelection === 'no'
                            ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)'
                            : 'none',
                        }}
                      >No</span>
                      <span>&gt;</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Terminal Window — floating cinematic frame */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="absolute inset-4 sm:inset-8 flex flex-col"
        style={{
          border: `2px solid ${PHOSPHOR}`,
          background: 'var(--terminal-darker)',
          boxShadow: `
            0 0 24px ${PHOSPHOR_GLOW},
            0 0 60px rgba(93, 217, 239, 0.08),
            0 24px 80px rgba(0,0,0,0.6),
            inset 0 0 80px rgba(0,0,0,0.95),
            inset 0 1px 0 rgba(93, 217, 239, 0.06)
          `,
        }}
      >
        {/* Window Title Bar */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{
            background: CHROME_BG,
            borderBottom: `1px solid ${PHOSPHOR}`,
          }}
        >
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 border" style={{ borderColor: PHOSPHOR, background: 'transparent' }} />
            <div className="w-2.5 h-2.5 border" style={{ borderColor: PHOSPHOR, background: 'transparent' }} />
            <div className="w-2.5 h-2.5 border" style={{ borderColor: PHOSPHOR, background: 'transparent' }} />
          </div>
          <span
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              color: PHOSPHOR,
              fontFamily: 'var(--font-chrome)',
              fontSize: '1.125rem',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textShadow: `0 0 10px ${PHOSPHOR_GLOW}`,
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
            background: CHROME_BG,
            borderBottom: `1px solid ${PHOSPHOR}`,
          }}
        >
          {['File', 'Edit', 'View', 'Terminal', 'Tabs', 'Help'].map((item, i) => (
            <motion.button
              key={item}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.04 }}
              whileHover={{ scale: 1.02 }}
              className="transition-colors duration-200"
              style={{
                color: PHOSPHOR,
                fontFamily: 'var(--font-chrome)',
                fontSize: '0.875rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textShadow: `0 0 6px ${PHOSPHOR_GLOW}`,
              }}
            >
              {item}
            </motion.button>
          ))}
        </div>

        {/* Terminal Content */}
        <div
          ref={terminalRef}
          data-terminal-scroll
          className="flex-1 overflow-auto p-8 outline-none relative cursor-text"
          style={{
            fontFamily: 'var(--font-terminal)',
            fontSize: '1.5rem',
            lineHeight: 1.5,
            background: 'var(--terminal-darker)',
            color: PHOSPHOR,
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
              width: 10px;
            }
            [data-terminal-scroll]::-webkit-scrollbar-track {
              background: var(--terminal-chrome);
            }
            [data-terminal-scroll]::-webkit-scrollbar-thumb {
              background: var(--terminal-dark);
              border: 1px solid var(--terminal-phosphor);
            }
            [data-terminal-scroll]::-webkit-scrollbar-thumb:hover {
              background: var(--terminal-phosphor);
            }
          `}</style>
          <div className="max-w-full">
            {terminalHistory.map((line, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  color: PHOSPHOR,
                  whiteSpace: 'pre',
                  textShadow: `0 0 4px ${PHOSPHOR_GLOW}, 0 0 12px rgba(93, 217, 239, 0.08)`,
                }}
              >
                {line}
              </motion.div>
            ))}
            <div
              style={{
                color: PHOSPHOR,
                whiteSpace: 'pre',
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                textShadow: `0 0 4px ${PHOSPHOR_GLOW}, 0 0 12px rgba(93, 217, 239, 0.08)`,
              }}
            >
              {promptSymbol} {currentInput}
              <span
                style={{
                  color: PHOSPHOR_DIM,
                  pointerEvents: 'none',
                }}
              >
                {ghostText}
              </span>
              {showCursor && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  className="inline-block align-middle ml-0.5"
                  style={{
                    width: '1ch',
                    height: '1.2em',
                    background: PHOSPHOR,
                    boxShadow: `0 0 10px ${PHOSPHOR_GLOW}, 0 0 24px rgba(93, 217, 239, 0.2)`,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Bottom status bar */}
        <div
          className="h-1.5"
          style={{
            background: CHROME_BG,
            borderTop: `1px solid ${PHOSPHOR}`,
          }}
        />
      </motion.div>
    </div>
  );
}
