import { useState } from 'react';
import { useMarketStore } from '../lib/store';

type StopMode = 'immediate' | 'after_settlement' | 'after_cycle';

interface Props {
  sendCommand: (cmd: unknown) => void;
}

export function ControlBar({ sendCommand }: Props) {
  const connected = useMarketStore((s) => s.connected);
  const [paused, setPaused] = useState(false);
  const [stopMode, setStopMode] = useState<StopMode>('after_settlement');

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <span className={`flex items-center gap-2 text-xs ${connected ? 'text-emerald-300' : 'text-rose-300'}`}>
        <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
        {connected ? 'Connected' : 'Disconnected'}
      </span>
      <div className="flex-1" />
      {paused ? (
        <button
          onClick={() => {
            sendCommand({ type: 'resume' });
            setPaused(false);
          }}
          className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400"
        >
          Resume
        </button>
      ) : (
        <button
          onClick={() => {
            sendCommand({ type: 'pause' });
            setPaused(true);
          }}
          className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-400"
        >
          Pause
        </button>
      )}
      <label className="flex items-center gap-2 text-xs text-slate-300">
        <span>Stop mode</span>
        <select
          value={stopMode}
          onChange={(e) => setStopMode(e.target.value as StopMode)}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
        >
          <option value="immediate">Immediate</option>
          <option value="after_settlement">After settlement</option>
          <option value="after_cycle">After cycle</option>
        </select>
      </label>
      <button
        onClick={() => sendCommand({ type: 'stop', mode: stopMode })}
        className="rounded-md bg-rose-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-400"
      >
        Stop
      </button>
    </div>
  );
}
