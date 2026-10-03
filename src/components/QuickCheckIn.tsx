import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { todayString } from '@/lib/date';
import type { DailyLog, DailyState, TrainingWin, NutritionWin } from '@/lib/types';
import { Dumbbell, Salad, Check, X, Star, Zap, Smile, Brain, Moon, StickyNote, ChevronRight } from 'lucide-react';

interface QuickCheckInProps {
  onComplete: () => void;
}

export function QuickCheckIn({ onComplete }: QuickCheckInProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'state' | 'wins' | 'optional' | 'done'>('state');
  const [log, setLog] = useState<DailyLog | null>(null);
  const [trainingWin, setTrainingWin] = useState<TrainingWin | null>(null);
  const [nutritionWin, setNutritionWin] = useState<NutritionWin | null>(null);
  const [selectedState, setSelectedState] = useState<DailyState | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const today = todayString();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [logRes, trainRes, nutRes] = await Promise.all([
        supabase.from('daily_logs').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('training_wins').select('*').eq('user_id', user.id).eq('date', today).limit(1),
        supabase.from('nutrition_wins').select('*').eq('user_id', user.id).eq('date', today).limit(1),
      ]);
      setLog(logRes.data as DailyLog | null);
      setSelectedState((logRes.data as DailyLog | null)?.daily_state ?? null);
      setTrainingWin((trainRes.data as TrainingWin[] | null)?.[0] ?? null);
      setNutritionWin((nutRes.data as NutritionWin[] | null)?.[0] ?? null);
    })();
  }, [user, today]);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1200);
  }

  const saveState = useCallback(async (state: DailyState) => {
    if (!user) return;
    setSaving(true);
    setSelectedState(state);
    if (log) {
      const { data } = await supabase.from('daily_logs').update({ daily_state: state }).eq('id', log.id).select('*').maybeSingle();
      if (data) setLog(data as DailyLog);
    } else {
      const { data } = await supabase.from('daily_logs').insert({ user_id: user.id, date: today, daily_state: state }).select('*').maybeSingle();
      if (data) setLog(data as DailyLog);
    }
    setSaving(false);
    setStep('wins');
  }, [user, log, today]);

  const recordTrainingWin = useCallback(async () => {
    if (!user || trainingWin) return;
    setSaving(true);
    const isHardDay = selectedState === 'hard';
    const { data } = await supabase.from('training_wins').insert({ user_id: user.id, date: today, difficult_day_win: isHardDay }).select('*').maybeSingle();
    if (data) setTrainingWin(data as TrainingWin);
    showFlash('Win saved');
    setSaving(false);
  }, [user, trainingWin, selectedState, today]);

  const recordNutritionWin = useCallback(async () => {
    if (!user || nutritionWin) return;
    setSaving(true);
    const isHardDay = selectedState === 'hard';
    const { data } = await supabase.from('nutrition_wins').insert({ user_id: user.id, date: today, difficult_day_win: isHardDay }).select('*').maybeSingle();
    if (data) setNutritionWin(data as NutritionWin);
    showFlash('Win saved');
    setSaving(false);
  }, [user, nutritionWin, selectedState, today]);

  return (
    <div className="fixed inset-0 z-[80] bg-white flex flex-col animate-fade-in">
      {flash && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[90]">
          <div className="bg-white rounded-full px-5 py-2.5 flex items-center gap-2 shadow-lg" style={{ border: '1px solid var(--color-success)' }}>
            <Check size={18} color="var(--color-success)" strokeWidth={3} />
            <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{flash}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-5 pt-6 pb-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Quick check-in</h1>
        <button onClick={onComplete} className="tap-target p-1">
          <X size={22} color="var(--color-text-muted)" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {step === 'state' && (
          <div className="space-y-5 animate-slide-up">
            <h2 className="text-2xl font-bold text-center" style={{ color: 'var(--color-text)' }}>How was today?</h2>
            <div className="space-y-3">
              <BigStateButton state="good" label="GOOD" emoji="🟢" selected={selectedState === 'good'} disabled={saving} onClick={() => saveState('good')} />
              <BigStateButton state="ok" label="OK" emoji="🟡" selected={selectedState === 'ok'} disabled={saving} onClick={() => saveState('ok')} />
              <BigStateButton state="hard" label="HARD" emoji="🔴" selected={selectedState === 'hard'} disabled={saving} onClick={() => saveState('hard')} />
            </div>
          </div>
        )}

        {step === 'wins' && (
          <div className="space-y-5 animate-slide-up">
            <h2 className="text-2xl font-bold text-center" style={{ color: 'var(--color-text)' }}>Anything to log?</h2>
            {selectedState === 'hard' && (
              <div className="card p-3 flex items-center gap-2" style={{ backgroundColor: 'var(--color-warning-light)' }}>
                <Star size={18} color="#f59e0b" fill="#f59e0b" />
                <p className="text-xs font-medium" style={{ color: '#92400e' }}>Wins on a hard day count as difficult-day wins.</p>
              </div>
            )}
            <div className="space-y-3">
              <BigWinButton
                icon={<Dumbbell size={28} color="var(--color-primary)" />}
                label="I Trained"
                done={!!trainingWin}
                disabled={saving}
                onClick={recordTrainingWin}
              />
              <BigWinButton
                icon={<Salad size={28} color="var(--color-accent)" />}
                label="I Ate on Plan"
                done={!!nutritionWin}
                disabled={saving}
                onClick={recordNutritionWin}
              />
            </div>
            {selectedState === 'hard' && (trainingWin || nutritionWin) && (
              <div className="card p-3 flex items-center gap-2 animate-pop" style={{ backgroundColor: 'var(--color-success-light)' }}>
                <Star size={18} color="#f59e0b" fill="#f59e0b" />
                <p className="text-sm font-semibold" style={{ color: '#15803d' }}>Difficult-day win recorded.</p>
              </div>
            )}
          </div>
        )}

        {step === 'optional' && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="text-xl font-bold text-center" style={{ color: 'var(--color-text)' }}>Add more?</h2>
            <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>All optional — skip anything you don't need.</p>
            <div className="space-y-2">
              <OptionalButton icon={<Zap size={20} color="#f59e0b" />} label="Energy" log={log} field="energy" />
              <OptionalButton icon={<Smile size={20} color="var(--color-primary)" />} label="Mood" log={log} field="mood" />
              <OptionalButton icon={<Brain size={20} color="var(--color-error)" />} label="Overwhelm" log={log} field="overwhelm" />
              <OptionalButton icon={<Moon size={20} color="#6366f1" />} label="Sleep" log={log} field="sleep_hours" />
              <OptionalButton icon={<StickyNote size={20} color="var(--color-text-muted)" />} label="Note" log={log} field="notes" />
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 animate-slide-up flex flex-col items-center justify-center min-h-[300px]">
            <div className="text-5xl">✓</div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>All caught up!</h2>
            <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>Your check-in is saved.</p>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-5 pb-6 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
        {step === 'wins' && (
          <div className="flex gap-3">
            <button onClick={() => setStep('optional')} className="btn-secondary flex-1">
              Add more
            </button>
            <button onClick={() => setStep('done')} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Check size={18} /> Done
            </button>
          </div>
        )}
        {step === 'optional' && (
          <div className="flex gap-3">
            <button onClick={() => setStep('wins')} className="btn-secondary flex-1">
              Back
            </button>
            <button onClick={() => setStep('done')} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Check size={18} /> Done
            </button>
          </div>
        )}
        {step === 'done' && (
          <button onClick={onComplete} className="btn-primary w-full">
            Close
          </button>
        )}
      </div>
    </div>
  );
}

function BigStateButton({ state, label, emoji, selected, disabled, onClick }: {
  state: DailyState;
  label: string;
  emoji: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const bgColor = state === 'good' ? '#22c55e' : state === 'ok' ? '#f59e0b' : '#ef4444';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-5 rounded-2xl flex items-center gap-4 tap-target transition-all ${selected ? 'text-white' : 'bg-white'}`}
      style={{
        backgroundColor: selected ? bgColor : 'white',
        border: selected ? 'none' : '1px solid var(--color-border)',
        boxShadow: selected ? `0 4px 12px ${bgColor}40` : 'none',
        opacity: disabled && !selected ? 0.6 : 1,
      }}
    >
      <span className="text-3xl">{emoji}</span>
      <span className="text-lg font-bold" style={{ color: selected ? 'white' : 'var(--color-text)' }}>{label}</span>
      {selected && <Check size={24} color="white" strokeWidth={3} className="ml-auto" />}
    </button>
  );
}

function BigWinButton({ icon, label, done, disabled, onClick }: {
  icon: React.ReactNode;
  label: string;
  done: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || done}
      className={`w-full p-5 rounded-2xl flex items-center gap-4 tap-target transition-all ${done ? 'text-white' : 'bg-white'}`}
      style={{
        backgroundColor: done ? 'var(--color-success)' : 'white',
        border: done ? 'none' : '1px solid var(--color-border)',
        boxShadow: done ? '0 4px 12px rgba(34,197,94,0.25)' : 'none',
        opacity: disabled && !done ? 0.6 : 1,
      }}
    >
      {icon}
      <span className="text-lg font-bold" style={{ color: done ? 'white' : 'var(--color-text)' }}>{label}</span>
      {done && (
        <div className="ml-auto flex items-center gap-1">
          <Check size={22} color="white" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

function OptionalButton({ icon, label, log, field }: {
  icon: React.ReactNode;
  label: string;
  log: DailyLog | null;
  field: string;
}) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState<string>('');
  const [numValue, setNumValue] = useState<number | null>(null);

  useEffect(() => {
    if (!log) return;
    const val = (log as unknown as Record<string, unknown>)[field];
    if (typeof val === 'number') setNumValue(val);
    else if (typeof val === 'string') setValue(val);
  }, [log, field]);

  async function save() {
    if (!user || !log) return;
    const updates: Record<string, unknown> = {};
    if (field === 'energy' || field === 'overwhelm' || field === 'sleep_hours') {
      updates[field] = numValue;
    } else {
      updates[field] = value || null;
    }
    await supabase.from('daily_logs').update(updates).eq('id', log.id);
    setExpanded(false);
  }

  const hasValue = log ? (log as unknown as Record<string, unknown>)[field] != null : false;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3.5 flex items-center gap-3 tap-target"
      >
        {icon}
        <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--color-text)' }}>{label}</span>
        {hasValue && <Check size={16} color="var(--color-success)" />}
        <ChevronRight size={18} color="var(--color-text-muted)" className={expanded ? 'rotate-90' : ''} style={{ transition: 'transform 0.2s' }} />
      </button>
      {expanded && (
        <div className="px-3.5 pb-3.5 space-y-3 animate-slide-up">
          {field === 'energy' || field === 'overwhelm' ? (
            <div className="flex gap-1.5 flex-wrap">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumValue(n)}
                  className={`w-9 h-9 rounded-xl text-sm font-semibold tap-target ${numValue === n ? 'text-white' : 'bg-gray-100'}`}
                  style={numValue === n ? { backgroundColor: field === 'overwhelm' ? 'var(--color-error)' : 'var(--color-primary)' } : {}}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : field === 'sleep_hours' ? (
            <input
              type="number"
              step="0.5"
              value={value || ''}
              onChange={(e) => { setValue(e.target.value); setNumValue(parseFloat(e.target.value) || null); }}
              placeholder="e.g. 7.5"
              className="input-field"
            />
          ) : (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="input-field min-h-[60px] resize-none"
              placeholder={field === 'mood' ? 'How are you feeling?' : 'Anything to remember...'}
            />
          )}
          <button onClick={save} className="btn-primary w-full text-sm">Save</button>
        </div>
      )}
    </div>
  );
}
