import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { syncCycleFromICS } from '@/lib/cycleSync';
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  dateToString,
  formatDateLabel,
  isToday,
  isFuture,
} from '@/lib/date';
import { MONTH_NAMES, DAY_NAMES, DIFFICULTY_LABELS, CYCLE_PHASES, DEFAULT_CYCLE_LENGTH, DEFAULT_QUICK_EVENTS } from '@/lib/constants';
import type { DailyLog, DailyState, TrainingWin, NutritionWin, EventRow, CustomActionLog, CycleLog } from '@/lib/types';
import { ChevronLeft, ChevronRight, Dumbbell, Salad, Star, X, Check, Trash2 } from 'lucide-react';

interface DayData {
  log: DailyLog | null;
  training: TrainingWin[];
  nutrition: NutritionWin[];
  events: EventRow[];
  customActionLogs: CustomActionLog[];
}

export function CalendarScreen() {
  const { user } = useAuth();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [dayDataMap, setDayDataMap] = useState<Record<string, DayData>>({});
  const [cycleLogs, setCycleLogs] = useState<CycleLog[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const loadMonth = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const startDate = dateToString(new Date(year, month, 1));
    const endDate = dateToString(new Date(year, month + 1, 0));

    const [logsRes, trainRes, nutRes, evtRes, customRes, cycleRes] = await Promise.all([
      supabase.from('daily_logs').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      supabase.from('training_wins').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      supabase.from('nutrition_wins').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      supabase.from('events').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      supabase.from('custom_action_logs').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      supabase.from('cycle_logs').select('*').eq('user_id', user.id).order('period_start_date', { ascending: false }).limit(6),
    ]);

    const map: Record<string, DayData> = {};
    for (const log of (logsRes.data as DailyLog[] ?? [])) {
      const key = log.date;
      if (!map[key]) map[key] = { log: null, training: [], nutrition: [], events: [], customActionLogs: [] };
      map[key].log = log;
    }
    for (const t of (trainRes.data as TrainingWin[] ?? [])) {
      if (!map[t.date]) map[t.date] = { log: null, training: [], nutrition: [], events: [], customActionLogs: [] };
      map[t.date].training.push(t);
    }
    for (const n of (nutRes.data as NutritionWin[] ?? [])) {
      if (!map[n.date]) map[n.date] = { log: null, training: [], nutrition: [], events: [], customActionLogs: [] };
      map[n.date].nutrition.push(n);
    }
    for (const e of (evtRes.data as EventRow[] ?? [])) {
      if (!map[e.date]) map[e.date] = { log: null, training: [], nutrition: [], events: [], customActionLogs: [] };
      map[e.date].events.push(e);
    }
    for (const c of (customRes.data as CustomActionLog[] ?? [])) {
      if (!map[c.date]) map[c.date] = { log: null, training: [], nutrition: [], events: [], customActionLogs: [] };
      map[c.date].customActionLogs.push(c);
    }
    setDayDataMap(map);
    setCycleLogs(cycleRes.data as CycleLog[] ?? []);
    setLoading(false);
  }, [user, year, month]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const autoSyncRef = useCallback(async () => {
    if (!user) return;
    const { data: integration } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_key', 'google_calendar_ics')
      .maybeSingle();
    const settings = integration as { enabled: boolean; settings: { ics_url?: string; last_synced_at?: string | null } } | null;
    if (!settings?.enabled || !settings.settings?.ics_url) return;
    const lastSynced = settings.settings.last_synced_at;
    if (lastSynced) {
      const hoursSince = (Date.now() - new Date(lastSynced).getTime()) / 3600000;
      if (hoursSince < 6) return;
    }
    await syncCycleFromICS(user.id, settings.settings.ics_url);
  }, [user]);

  useEffect(() => {
    autoSyncRef();
  }, [autoSyncRef]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }

  function getStateColor(state: string | undefined): string {
    if (!state) return 'transparent';
    if (state === 'good') return '#22c55e';
    if (state === 'ok') return '#f59e0b';
    if (state === 'hard') return '#ef4444';
    return 'transparent';
  }

  function hasDifficultWin(day: DayData | undefined): boolean {
    if (!day) return false;
    return [...day.training, ...day.nutrition, ...day.customActionLogs].some((w) => 'difficult_day_win' in w && w.difficult_day_win);
  }

  function getCyclePhaseForDate(dateStr: string): { color: string; label: string } | null {
    if (cycleLogs.length === 0) return null;
    const date = new Date(dateStr + 'T00:00:00');
    for (const cycle of cycleLogs) {
      const start = new Date(cycle.period_start_date + 'T00:00:00');
      const diff = Math.floor((date.getTime() - start.getTime()) / 86400000);
      const cycleLen = cycle.cycle_length ?? DEFAULT_CYCLE_LENGTH;
      if (diff < 0) continue;
      if (diff > cycleLen) continue;
      for (const phase of CYCLE_PHASES) {
        const [min, max] = phase.dayRange;
        if (diff >= min && diff <= max && diff <= cycleLen) {
          return { color: phase.color, label: phase.label };
        }
      }
    }
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Calendar</h1>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 tap-target">
          <ChevronLeft size={22} color="var(--color-text)" />
        </button>
        <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
          {MONTH_NAMES[month]} {year}
        </p>
        <button onClick={nextMonth} className="p-2 tap-target">
          <ChevronRight size={22} color="var(--color-text)" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="card p-3">
        <div className="grid grid-cols-7 mb-2">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--color-text-muted)' }}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={idx} />;
            const dateStr = dateToString(new Date(year, month, day));
            const dayData = dayDataMap[dateStr];
            const state = dayData?.log?.daily_state;
            const future = isFuture(dateStr);
            const todayFlag = isToday(dateStr);
            const isLogged = !!dayData?.log;
            const cyclePhase = getCyclePhaseForDate(dateStr);

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(dateStr)}
                className={`relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 tap-target transition-all ${todayFlag ? 'ring-2' : ''}`}
                style={{
                  backgroundColor: isLogged && state ? getStateColor(state) + '20' : 'transparent',
                  ...(todayFlag ? { boxShadow: '0 0 0 2px var(--color-primary)' } : {}),
                }}
              >
                <span
                  className="text-xs font-semibold"
                  style={{ color: future ? 'var(--color-text-muted)' : 'var(--color-text)' }}
                >
                  {day}
                </span>
                {state && (
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStateColor(state) }} />
                )}
                {cyclePhase && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cyclePhase.color }} />
                )}
                <div className="flex gap-0.5 absolute bottom-1">
                  {dayData && dayData.training.length > 0 && (
                    <Dumbbell size={8} color="var(--color-primary)" strokeWidth={2.5} />
                  )}
                  {dayData && dayData.nutrition.length > 0 && (
                    <Salad size={8} color="var(--color-accent)" strokeWidth={2.5} />
                  )}
                  {hasDifficultWin(dayData) && (
                    <Star size={8} color="#f59e0b" strokeWidth={2.5} fill="#f59e0b" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-1">
        <LegendItem color="#22c55e" label="Good" />
        <LegendItem color="#f59e0b" label="OK" />
        <LegendItem color="#ef4444" label="Hard" />
        <div className="flex items-center gap-1.5">
          <Dumbbell size={12} color="var(--color-primary)" />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Trained</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Salad size={12} color="var(--color-accent)" />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Nutrition</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Star size={12} color="#f59e0b" fill="#f59e0b" />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Difficult-day win</span>
        </div>
        {cycleLogs.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CYCLE_PHASES[0].color }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Cycle phase</span>
          </div>
        )}
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
        Tap any day to add or edit data for that date.
      </p>

      {/* Day editor modal */}
      {selectedDay && (
        <DayEditor
          dateStr={selectedDay}
          data={dayDataMap[selectedDay] ?? { log: null, training: [], nutrition: [], events: [], customActionLogs: [] }}
          onClose={() => setSelectedDay(null)}
          onUpdated={loadMonth}
        />
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  );
}

function DayEditor({
  dateStr,
  data,
  onClose,
  onUpdated,
}: {
  dateStr: string;
  data: DayData;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { user } = useAuth();
  const [dailyState, setDailyState] = useState<DailyState | null>(data.log?.daily_state ?? null);
  const [energy, setEnergy] = useState<number | null>(data.log?.energy ?? null);
  const [overwhelm, setOverwhelm] = useState<number | null>(data.log?.overwhelm ?? null);
  const [mood, setMood] = useState<string | null>(data.log?.mood ?? null);
  const [sleepHours, setSleepHours] = useState<string>(data.log?.sleep_hours?.toString() ?? '');
  const [notes, setNotes] = useState<string>(data.log?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [showAddWin, setShowAddWin] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [localTraining, setLocalTraining] = useState<TrainingWin[]>(data.training);
  const [localNutrition, setLocalNutrition] = useState<NutritionWin[]>(data.nutrition);
  const [localEvents, setLocalEvents] = useState<EventRow[]>(data.events);
  const [localCustomLogs] = useState<CustomActionLog[]>(data.customActionLogs);

  const hasLog = !!data.log;
  const hasAnyData = dailyState !== null || energy !== null || overwhelm !== null || mood !== null || !!sleepHours || !!notes.trim();

  async function saveLog() {
    if (!user) return;
    setSaving(true);
    const updates: Record<string, unknown> = {
      daily_state: dailyState,
      energy,
      overwhelm,
      mood,
      sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
      notes: notes || null,
    };
    if (data.log) {
      await supabase.from('daily_logs').update(updates).eq('id', data.log.id);
    } else {
      await supabase.from('daily_logs').insert({
        user_id: user.id,
        date: dateStr,
        ...updates,
      });
    }
    setSaving(false);
    onUpdated();
    onClose();
  }

  async function deleteDay() {
    if (!user || !data.log) return;
    await supabase.from('daily_logs').delete().eq('id', data.log.id);
    onUpdated();
    onClose();
  }

  async function addTrainingWin() {
    if (!user) return;
    const isHardDay = dailyState === 'hard';
    const { data: inserted } = await supabase.from('training_wins').insert({
      user_id: user.id,
      date: dateStr,
      difficult_day_win: isHardDay,
    }).select('*').maybeSingle();
    if (inserted) setLocalTraining([...localTraining, inserted as TrainingWin]);
    setShowAddWin(false);
    onUpdated();
  }

  async function addNutritionWin() {
    if (!user) return;
    const isHardDay = dailyState === 'hard';
    const { data: inserted } = await supabase.from('nutrition_wins').insert({
      user_id: user.id,
      date: dateStr,
      difficult_day_win: isHardDay,
    }).select('*').maybeSingle();
    if (inserted) setLocalNutrition([...localNutrition, inserted as NutritionWin]);
    setShowAddWin(false);
    onUpdated();
  }

  async function deleteTrainingWin(id: string) {
    await supabase.from('training_wins').delete().eq('id', id);
    setLocalTraining(localTraining.filter((t) => t.id !== id));
    onUpdated();
  }

  async function deleteNutritionWin(id: string) {
    await supabase.from('nutrition_wins').delete().eq('id', id);
    setLocalNutrition(localNutrition.filter((n) => n.id !== id));
    onUpdated();
  }

  async function addEvent(eventKey: string, eventLabel: string, eventIcon: string) {
    if (!user) return;
    const { data: inserted } = await supabase.from('events').insert({
      user_id: user.id,
      date: dateStr,
      event_key: eventKey,
      event_label: eventLabel,
      event_icon: eventIcon,
    }).select('*').maybeSingle();
    if (inserted) setLocalEvents([...localEvents, inserted as EventRow]);
    setShowAddEvent(false);
    onUpdated();
  }

  async function deleteEvent(id: string) {
    await supabase.from('events').delete().eq('id', id);
    setLocalEvents(localEvents.filter((e) => e.id !== id));
    onUpdated();
  }

  const stateLabel = dailyState
    ? dailyState.charAt(0).toUpperCase() + dailyState.slice(1)
    : 'Not logged yet';

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 space-y-5 animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between sticky top-0 bg-white pb-2 z-20 -mx-6 px-6 pt-1" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {hasLog ? formatDateLabel(dateStr) : `Add data for ${formatDateLabel(dateStr)}`}
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{stateLabel}</p>
          </div>
          <button onClick={onClose}>
            <X size={22} color="var(--color-text-muted)" />
          </button>
        </div>

        {/* Daily state selector */}
        <div>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Day state</p>
          <div className="grid grid-cols-3 gap-2">
            {(['good', 'ok', 'hard'] as DailyState[]).map((s) => (
              <button
                key={s}
                onClick={() => setDailyState(dailyState === s ? null : s)}
                className={`py-2.5 rounded-xl text-sm font-semibold capitalize tap-target transition-all ${dailyState === s ? 'text-white' : 'bg-gray-100'}`}
                style={dailyState === s ? { backgroundColor: s === 'good' ? '#22c55e' : s === 'ok' ? '#f59e0b' : '#ef4444' } : {}}
              >
                {s === 'good' ? '🟢 ' : s === 'ok' ? '🟡 ' : '🔴 '}{s}
              </button>
            ))}
          </div>
        </div>

        {/* Wins section — always visible */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="section-title">Wins</p>
            <button onClick={() => setShowAddWin(!showAddWin)} className="text-xs font-semibold tap-target" style={{ color: 'var(--color-primary)' }}>
              {showAddWin ? 'Cancel' : '+ Add win'}
            </button>
          </div>

          {showAddWin && (
            <div className="flex gap-2 pb-2">
              <button onClick={addTrainingWin} className="card flex-1 p-3 flex items-center justify-center gap-2 tap-target">
                <Dumbbell size={18} color="var(--color-primary)" />
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Trained</span>
              </button>
              <button onClick={addNutritionWin} className="card flex-1 p-3 flex items-center justify-center gap-2 tap-target">
                <Salad size={18} color="var(--color-accent)" />
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Ate on plan</span>
              </button>
            </div>
          )}

          {localTraining.length === 0 && localNutrition.length === 0 && localCustomLogs.length === 0 && !showAddWin && (
            <p className="text-xs text-center py-2" style={{ color: 'var(--color-text-muted)' }}>
              No wins logged for this day yet. Tap "+ Add win" to log one.
            </p>
          )}

          {localTraining.map((t) => (
            <div key={t.id} className="card p-3 flex items-center gap-2.5">
              <Dumbbell size={18} color="var(--color-primary)" />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t.win_type ?? 'Trained'}</p>
                {t.difficulty && (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Difficulty: {DIFFICULTY_LABELS[t.difficulty]}</p>
                )}
                {t.helping_factors && t.helping_factors.length > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Helped by: {t.helping_factors.join(', ')}</p>
                )}
                {t.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t.notes}</p>}
              </div>
              {t.difficult_day_win && <Star size={16} color="#f59e0b" fill="#f59e0b" />}
              <button onClick={() => deleteTrainingWin(t.id)} className="tap-target p-1">
                <Trash2 size={15} color="var(--color-text-muted)" />
              </button>
            </div>
          ))}
          {localNutrition.map((n) => (
            <div key={n.id} className="card p-3 flex items-center gap-2.5">
              <Salad size={18} color="var(--color-accent)" />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{n.win_type ?? 'Ate on plan'}</p>
                {n.difficulty && (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Difficulty: {DIFFICULTY_LABELS[n.difficulty]}</p>
                )}
                {n.helping_factors && n.helping_factors.length > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Helped by: {n.helping_factors.join(', ')}</p>
                )}
                {n.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{n.notes}</p>}
              </div>
              {n.difficult_day_win && <Star size={16} color="#f59e0b" fill="#f59e0b" />}
              <button onClick={() => deleteNutritionWin(n.id)} className="tap-target p-1">
                <Trash2 size={15} color="var(--color-text-muted)" />
              </button>
            </div>
          ))}
          {localCustomLogs.map((c) => (
            <div key={c.id} className="card p-3 flex items-center gap-2.5">
              <Star size={18} color="var(--color-warning)" />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Custom action</p>
                {c.difficult_day_win && <p className="text-xs" style={{ color: '#f59e0b' }}>Difficult-day win</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Events section — always visible */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="section-title">Events</p>
            <button onClick={() => setShowAddEvent(!showAddEvent)} className="text-xs font-semibold tap-target" style={{ color: 'var(--color-primary)' }}>
              {showAddEvent ? 'Cancel' : '+ Add event'}
            </button>
          </div>

          {showAddEvent && (
            <div className="flex flex-wrap gap-2 pb-2">
              {DEFAULT_QUICK_EVENTS.map((evt) => (
                <button
                  key={evt.key}
                  onClick={() => addEvent(evt.key, evt.label, evt.icon)}
                  className="card px-3 py-2 text-sm flex items-center gap-1.5 tap-target"
                >
                  <span>{evt.icon}</span>
                  <span style={{ color: 'var(--color-text)' }}>{evt.label}</span>
                </button>
              ))}
            </div>
          )}

          {localEvents.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {localEvents.map((evt) => (
                <div key={evt.id} className="card px-3 py-2 text-sm flex items-center gap-1.5">
                  {evt.event_icon && <span>{evt.event_icon}</span>}
                  <span style={{ color: 'var(--color-text)' }}>{evt.event_label}</span>
                  <button onClick={() => deleteEvent(evt.id)} className="tap-target ml-1">
                    <X size={14} color="var(--color-text-muted)" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {localEvents.length === 0 && !showAddEvent && (
            <p className="text-xs text-center py-2" style={{ color: 'var(--color-text-muted)' }}>
              No events for this day.
            </p>
          )}
        </div>

        {/* Editable fields */}
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Energy</p>
            <div className="flex gap-1.5 flex-wrap">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button
                  key={n}
                  onClick={() => setEnergy(energy === n ? null : n)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold tap-target ${energy === n ? 'text-white' : 'bg-gray-100'}`}
                  style={energy === n ? { backgroundColor: 'var(--color-primary)' } : {}}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Overwhelm</p>
            <div className="flex gap-1.5 flex-wrap">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button
                  key={n}
                  onClick={() => setOverwhelm(overwhelm === n ? null : n)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold tap-target ${overwhelm === n ? 'text-white' : 'bg-gray-100'}`}
                  style={overwhelm === n ? { backgroundColor: 'var(--color-error)' } : {}}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Mood</p>
            <input
              value={mood ?? ''}
              onChange={(e) => setMood(e.target.value || null)}
              placeholder="How are you feeling?"
              className="input-field"
            />
          </div>

          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Sleep hours</p>
            <input
              type="number"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="e.g. 7.5"
              className="input-field"
            />
          </div>

          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field min-h-[80px] resize-none"
              placeholder="Anything to remember..."
            />
          </div>
        </div>

        <div className="flex gap-3 sticky bottom-0 bg-white pt-3 pb-4 -mx-6 px-6 z-20" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button onClick={saveLog} disabled={saving || (!hasAnyData && !dailyState)} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Check size={18} /> {hasLog ? 'Save' : 'Create entry'}
          </button>
          {hasLog && (
            <button onClick={deleteDay} className="btn-secondary flex items-center gap-2" style={{ color: 'var(--color-error)' }}>
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
