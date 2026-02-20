const commands = [
  { cmd: '1. whoami', hint: 'Identify yourself' },
  { cmd: '2. uname -a', hint: 'Check system info' },
  { cmd: '3. login backdoor', hint: 'Access backdoor' },
  { cmd: '4. bin/history', hint: 'View command history' },
  { cmd: '5. access', hint: 'Enter the website' },
];

export function LegendPanel() {
  return (
    <div
      className="backdrop-blur-sm rounded-lg overflow-hidden"
      style={{
        background: 'rgba(10, 10, 10, 0.6)',
        border: '1px solid rgba(125, 211, 252, 0.3)',
      }}
    >
      {/* Header */}
      <div 
        className="px-5 py-3 border-b"
        style={{ 
          borderColor: 'rgba(125, 211, 252, 0.2)',
          background: 'rgba(0, 0, 0, 0.3)',
        }}
      >
        <span 
          className="tracking-widest"
          style={{ 
            color: '#7dd3fc',
            fontFamily: 'VT323, monospace',
            fontSize: '22px',
          }}
        >
          COMMANDS
        </span>
      </div>
      
      {/* Commands List */}
      <div className="p-5 space-y-3">
        {commands.map((item) => (
          <div key={item.cmd} className="group">
            <div 
              className="mb-1"
              style={{ 
                color: '#7dd3fc',
                fontFamily: 'VT323, monospace',
                fontSize: '20px',
              }}
            >
              {item.cmd}
            </div>
            <div 
              className="pl-4 opacity-70"
              style={{ 
                color: '#7dd3fc',
                fontFamily: 'VT323, monospace',
                fontSize: '18px',
              }}
            >
              {item.hint}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
