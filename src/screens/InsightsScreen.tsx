import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { dateToString, formatDateShort } from '@/lib/date';
import { MONTH_NAMES, CYCLE_PHASES, DEFAULT_CYCLE_LENGTH } from '@/lib/constants';
import type { DailyLog, TrainingWin, NutritionWin, EventRow, CustomActionLog, CycleLog } from '@/lib/types';
import { Sparkles, Dumbbell, Salad, Star, Zap, Activity, Moon, Calendar, TrendingUp } from 'lucide-react';

interface MonthData {
  logs: DailyLog[];
  training: TrainingWin[];
  nutrition: NutritionWin[];
  events: EventRow[];
  customActionLogs: CustomActionLog[];
  cycleLogs: CycleLog[];
}

type ViewMode = 'monthly' | 'weekly' | 'cycle';

export function InsightsScreen() {
  const { user } = useAuth();
  const [currentData, setCurrentData] = useState<MonthData>({ logs: [], training: [], nutrition: [], events: [], customActionLogs: [], cycleLogs: [] });
  const [prevData, setPrevData] = useState<MonthData>({ logs: [], training: [], nutrition: [], events: [], customActionLogs: [], cycleLogs: [] });
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const loadMonthData = useCallback(async (y: number, m: number): Promise<MonthData> => {
    if (!user) return { logs: [], training: [], nutrition: [], events: [], customActionLogs: [], cycleLogs: [] };
    const startDate = dateToString(new Date(y, m, 1));
    const endDate = dateToString(new Date(y, m + 1, 0));
    const [logsRes, trainRes, nutRes, evtRes, customRes, cycleRes] = await Promise.all([
      supabase.from('daily_logs').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      supabase.from('training_wins').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      supabase.from('nutrition_wins').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      supabase.from('events').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      supabase.from('custom_action_logs').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      supabase.from('cycle_logs').select('*').eq('user_id', user.id).gte('period_start_date', startDate).lte('period_start_date', endDate),
    ]);
    return {
      logs: (logsRes.data as DailyLog[] ?? []),
      training: (trainRes.data as TrainingWin[] ?? []),
      nutrition: (nutRes.data as NutritionWin[] ?? []),
      events: (evtRes.data as EventRow[] ?? []),
      customActionLogs: (customRes.data as CustomActionLog[] ?? []),
      cycleLogs: (cycleRes.data as CycleLog[] ?? []),
    };
  }, [user]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [curr, prev] = await Promise.all([
        loadMonthData(year, month),
        loadMonthData(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1),
      ]);
      setCurrentData(curr);
      setPrevData(prev);
      setLoading(false);
    })();
  }, [loadMonthData, year, month]);

  const stats = useMemo(() => computeStats(currentData, prevData), [currentData, prevData]);
  const patterns = useMemo(() => detectPatterns(currentData), [currentData]);
  const moments = useMemo(() => findMoments(currentData), [currentData]);
  const weeklyStats = useMemo(() => computeWeeklyStats(currentData), [currentData]);
  const cycleStats = useMemo(() => computeCycleStats(currentData), [currentData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Insights</h1>

      {/* View mode toggle */}
      <div className="flex bg-gray-100 rounded-2xl p-1">
        <button onClick={() => setViewMode('monthly')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewMode === 'monthly' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Monthly</button>
        <button onClick={() => setViewMode('weekly')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewMode === 'weekly' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Weekly</button>
        <button onClick={() => setViewMode('cycle')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewMode === 'cycle' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Cycle</button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{MONTH_NAMES[month]} {year}</p>
        <div className="flex gap-2">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border tap-target" style={{ borderColor: 'var(--color-border)' }}>Prev</button>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border tap-target" style={{ borderColor: 'var(--color-border)' }}>Next</button>
        </div>
      </div>

      {stats.loggedDays === 0 ? (
        <div className="card p-6 text-center space-y-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>No data logged this month yet</p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Keep logging naturally. We'll start showing patterns when there's enough information.</p>
        </div>
      ) : viewMode === 'monthly' ? (
        <>
          {/* How you showed up */}
          <div className="card p-5 space-y-4">
            <p className="section-title">How you showed up</p>
            <div className="grid grid-cols-3 gap-3">
              <ShowUpCard icon={<Dumbbell size={20} color="var(--color-primary)" />} value={stats.trainingWinCount} label="Training wins" prev={stats.prevTrainingWinCount} />
              <ShowUpCard icon={<Salad size={20} color="var(--color-accent)" />} value={stats.nutritionWinCount} label="Nutrition wins" prev={stats.prevNutritionWinCount} />
              <ShowUpCard icon={<Star size={20} color="#f59e0b" fill="#f59e0b" />} value={stats.difficultDayWins} label="Difficult-day wins" prev={stats.prevDifficultDayWins} />
            </div>
          </div>

          {/* Monthly totals */}
          <div className="card p-5 space-y-3">
            <p className="section-title">This month</p>
            <TotalRow label="Total positive actions" value={stats.totalActions} />
            <TotalRow label="Easy/OK-day wins" value={stats.easyDayWins} />
            <TotalRow label="Difficult-day wins" value={stats.difficultDayWins} />
          </div>

          {/* Monthly averages */}
          <div className="card p-5 space-y-4">
            <p className="section-title">Monthly averages</p>
            <AvgRow icon={<Zap size={16} color="#f59e0b" />} label="Average energy" current={stats.avgEnergy} prev={stats.prevAvgEnergy} suffix="/10" />
            <AvgRow icon={<Activity size={16} color="var(--color-error)" />} label="Average overwhelm" current={stats.avgOverwhelm} prev={stats.prevAvgOverwhelm} suffix="/10" />
            <AvgRow icon={<Moon size={16} color="var(--color-primary)" />} label="Average sleep" current={stats.avgSleep} prev={stats.prevAvgSleep} suffix="h" />
          </div>

          {/* Positive actions */}
          <div className="card p-5 space-y-4">
            <p className="section-title">Positive action rate</p>
            <ActionRow label="Training" current={stats.trainingPct} prev={stats.prevTrainingPct} />
            <ActionRow label="Nutrition" current={stats.nutritionPct} prev={stats.prevNutritionPct} />
            <ActionRow label="Difficult-day action rate" current={stats.difficultDayActionRate} prev={stats.prevDifficultDayActionRate} />
          </div>

          {/* Moments worth noticing */}
          {moments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Star size={18} color="#f59e0b" fill="#f59e0b" />
                <p className="section-title">Moments worth noticing</p>
              </div>
              {moments.map((m, idx) => (
                <div key={idx} className="card p-4 space-y-1.5 animate-slide-up">
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{formatDateShort(m.date)}</p>
                  <p className="text-sm" style={{ color: 'var(--color-text)' }}>Hard day</p>
                  {m.energy !== null && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Energy: {m.energy}/10</p>}
                  {m.overwhelm !== null && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Overwhelm: {m.overwhelm}/10</p>}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Star size={14} color="#f59e0b" fill="#f59e0b" />
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{m.winDescription}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pattern detection */}
          {patterns.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} color="var(--color-warning)" />
                <p className="section-title">Patterns in your data</p>
              </div>
              {patterns.map((p, idx) => (
                <div key={idx} className="card p-4 animate-slide-up">
                  <p className="text-sm" style={{ color: 'var(--color-text)' }}>{p}</p>
                </div>
              ))}
            </div>
          )}

          {patterns.length === 0 && stats.loggedDays < 14 && (
            <div className="card p-4">
              <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>Keep logging naturally. We'll start showing patterns when there's enough information.</p>
            </div>
          )}
        </>
      ) : viewMode === 'weekly' ? (
        <>
          {weeklyStats.map((week, idx) => (
            <div key={idx} className="card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} color="var(--color-primary)" />
                <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{week.label}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MiniStat icon={<Dumbbell size={16} color="var(--color-primary)" />} value={week.trainingCount} label="Training" />
                <MiniStat icon={<Salad size={16} color="var(--color-accent)" />} value={week.nutritionCount} label="Nutrition" />
                <MiniStat icon={<Star size={16} color="#f59e0b" fill="#f59e0b" />} value={week.difficultWinCount} label="Diff-day wins" />
              </div>
              {week.prevWeek && (
                <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <TrendingUp size={14} color="var(--color-text-muted)" />
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Last week: {week.prevWeek.trainingCount} training, {week.prevWeek.nutritionCount} nutrition, {week.prevWeek.difficultWinCount} diff-day wins
                  </p>
                </div>
              )}
              {week.loggedDays === 0 && (
                <p className="text-xs text-center pt-1" style={{ color: 'var(--color-text-muted)' }}>No data this week.</p>
              )}
            </div>
          ))}
        </>
      ) : (
        <>
          {/* Cycle-based stats */}
          {cycleStats.hasCycleData ? (
            <>
              <div className="card p-5 space-y-3">
                <p className="section-title">Cycle overview</p>
                <TotalRow label="Cycles logged" value={cycleStats.cycleCount} />
                <TotalRow label="Avg cycle length" value={cycleStats.avgCycleLength ? `${cycleStats.avgCycleLength} days` : '—'} />
                <TotalRow label="Avg period length" value={cycleStats.avgPeriodLength ? `${cycleStats.avgPeriodLength} days` : '—'} />
              </div>

              {/* Phase breakdown */}
              <div className="card p-5 space-y-3">
                <p className="section-title">Wins by cycle phase</p>
                {cycleStats.phaseBreakdown.map((phase) => (
                  <div key={phase.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: phase.color }} />
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>{phase.label}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{phase.winCount} wins</span>
                  </div>
                ))}
              </div>

              {/* Cycle correlations */}
              {cycleStats.correlations.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} color="var(--color-warning)" />
                    <p className="section-title">Cycle correlations</p>
                  </div>
                  {cycleStats.correlations.map((c, idx) => (
                    <div key={idx} className="card p-4">
                      <p className="text-sm" style={{ color: 'var(--color-text)' }}>{c}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="card p-6 text-center space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>No cycle data logged yet</p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Log your period start date in Settings to see cycle-based insights.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ShowUpCard({ icon, value, label, prev }: { icon: ReactNode; value: number; label: string; prev: number }) {
  return (
    <div className="flex flex-col items-center text-center gap-1">
      {icon}
      <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
      <p className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      {prev > 0 && <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Last: {prev}</p>}
    </div>
  );
}

function AvgRow({ icon, label, current, prev, suffix }: { icon: ReactNode; label: string; current: number | null; prev: number | null; suffix: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex-1"><p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</p></div>
      <div className="text-right">
        <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{current !== null ? `${current.toFixed(1)}${suffix}` : '—'}</span>
        {prev !== null && <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>Last: {prev.toFixed(1)}{suffix}</span>}
      </div>
    </div>
  );
}

function ActionRow({ label, current, prev }: { label: string; current: number | null; prev: number | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <div className="text-right">
        <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{current !== null ? `${current}%` : 'Not enough data yet'}</span>
        {prev !== null && current !== null && <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>Last: {prev}%</span>}
      </div>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-1">
      {icon}
      <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
      <p className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
    </div>
  );
}

interface Stats {
  loggedDays: number;
  trainingWinCount: number; prevTrainingWinCount: number;
  nutritionWinCount: number; prevNutritionWinCount: number;
  difficultDayWins: number; prevDifficultDayWins: number;
  avgEnergy: number | null; prevAvgEnergy: number | null;
  avgOverwhelm: number | null; prevAvgOverwhelm: number | null;
  avgSleep: number | null; prevAvgSleep: number | null;
  trainingPct: number | null; prevTrainingPct: number | null;
  nutritionPct: number | null; prevNutritionPct: number | null;
  difficultDayActionRate: number | null; prevDifficultDayActionRate: number | null;
  totalActions: number; easyDayWins: number;
}

function computeStats(curr: MonthData, prev: MonthData): Stats {
  const loggedDays = curr.logs.length;
  const trainingWinCount = curr.training.length;
  const nutritionWinCount = curr.nutrition.length;
  const prevTrainingWinCount = prev.training.length;
  const prevNutritionWinCount = prev.nutrition.length;

  const allWins = [...curr.training, ...curr.nutrition, ...curr.customActionLogs];
  const difficultDayWins = allWins.filter((w) => 'difficult_day_win' in w && w.difficult_day_win).length;
  const prevDifficultDayWins = [...prev.training, ...prev.nutrition, ...prev.customActionLogs].filter((w) => 'difficult_day_win' in w && w.difficult_day_win).length;
  const easyDayWins = allWins.filter((w) => !('difficult_day_win' in w && w.difficult_day_win)).length;

  const energyLogs = curr.logs.filter((l) => l.energy !== null);
  const prevEnergyLogs = prev.logs.filter((l) => l.energy !== null);
  const avgEnergy = energyLogs.length > 0 ? energyLogs.reduce((s, l) => s + (l.energy ?? 0), 0) / energyLogs.length : null;
  const prevAvgEnergy = prevEnergyLogs.length > 0 ? prevEnergyLogs.reduce((s, l) => s + (l.energy ?? 0), 0) / prevEnergyLogs.length : null;

  const overwhelmLogs = curr.logs.filter((l) => l.overwhelm !== null);
  const prevOverwhelmLogs = prev.logs.filter((l) => l.overwhelm !== null);
  const avgOverwhelm = overwhelmLogs.length > 0 ? overwhelmLogs.reduce((s, l) => s + (l.overwhelm ?? 0), 0) / overwhelmLogs.length : null;
  const prevAvgOverwhelm = prevOverwhelmLogs.length > 0 ? prevOverwhelmLogs.reduce((s, l) => s + (l.overwhelm ?? 0), 0) / prevOverwhelmLogs.length : null;

  const sleepLogs = curr.logs.filter((l) => l.sleep_hours !== null);
  const prevSleepLogs = prev.logs.filter((l) => l.sleep_hours !== null);
  const avgSleep = sleepLogs.length > 0 ? sleepLogs.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / sleepLogs.length : null;
  const prevAvgSleep = prevSleepLogs.length > 0 ? prevSleepLogs.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / prevSleepLogs.length : null;

  const daysWithTraining = new Set(curr.training.map((t) => t.date)).size;
  const daysWithNutrition = new Set(curr.nutrition.map((n) => n.date)).size;
  const prevDaysWithTraining = new Set(prev.training.map((t) => t.date)).size;
  const prevDaysWithNutrition = new Set(prev.nutrition.map((n) => n.date)).size;

  const trainingPct = loggedDays >= 7 ? Math.round((daysWithTraining / loggedDays) * 100) : null;
  const nutritionPct = loggedDays >= 7 ? Math.round((daysWithNutrition / loggedDays) * 100) : null;
  const prevTrainingPct = prev.logs.length >= 7 ? Math.round((prevDaysWithTraining / prev.logs.length) * 100) : null;
  const prevNutritionPct = prev.logs.length >= 7 ? Math.round((prevDaysWithNutrition / prev.logs.length) * 100) : null;

  const hardDays = curr.logs.filter((l) => l.daily_state === 'hard');
  const prevHardDays = prev.logs.filter((l) => l.daily_state === 'hard');
  const hardDayDates = new Set(hardDays.map((l) => l.date));
  const prevHardDayDates = new Set(prevHardDays.map((l) => l.date));
  const hardDaysWithAction = new Set([...curr.training, ...curr.nutrition, ...curr.customActionLogs].filter((w) => hardDayDates.has(w.date)).map((w) => w.date)).size;
  const prevHardDaysWithAction = new Set([...prev.training, ...prev.nutrition, ...prev.customActionLogs].filter((w) => prevHardDayDates.has(w.date)).map((w) => w.date)).size;
  const difficultDayActionRate = hardDays.length >= 3 ? Math.round((hardDaysWithAction / hardDays.length) * 100) : null;
  const prevDifficultDayActionRate = prevHardDays.length >= 3 ? Math.round((prevHardDaysWithAction / prevHardDays.length) * 100) : null;

  return {
    loggedDays, trainingWinCount, prevTrainingWinCount, nutritionWinCount, prevNutritionWinCount,
    difficultDayWins, prevDifficultDayWins, avgEnergy, prevAvgEnergy, avgOverwhelm, prevAvgOverwhelm,
    avgSleep, prevAvgSleep, trainingPct, prevTrainingPct, nutritionPct, prevNutritionPct,
    difficultDayActionRate, prevDifficultDayActionRate,
    totalActions: allWins.length, easyDayWins,
  };
}

interface Moment { date: string; energy: number | null; overwhelm: number | null; winDescription: string }

function findMoments(data: MonthData): Moment[] {
  const hardDayDates = new Set(data.logs.filter((l) => l.daily_state === 'hard').map((l) => l.date));
  const trainingMoments: Moment[] = data.training.filter((w) => hardDayDates.has(w.date)).map((w) => {
    const log = data.logs.find((l) => l.date === w.date);
    return { date: w.date, energy: log?.energy ?? null, overwhelm: log?.overwhelm ?? null, winDescription: `You ${w.win_type?.toLowerCase() ?? 'trained'}.` };
  });
  const nutritionMoments: Moment[] = data.nutrition.filter((w) => hardDayDates.has(w.date)).map((w) => {
    const log = data.logs.find((l) => l.date === w.date);
    return { date: w.date, energy: log?.energy ?? null, overwhelm: log?.overwhelm ?? null, winDescription: `You ${w.win_type?.toLowerCase() ?? 'ate on plan'}.` };
  });
  const moments = [...trainingMoments, ...nutritionMoments];
  moments.sort((a, b) => b.date.localeCompare(a.date));
  return moments.slice(0, 5);
}

function detectPatterns(data: MonthData): string[] {
  const patterns: string[] = [];
  const minDataPoints = 14;
  if (data.logs.length < minDataPoints) return patterns;

  const trainingDates = new Set(data.training.map((t) => t.date));
  const energyOnTrainDays = data.logs.filter((l) => trainingDates.has(l.date) && l.energy !== null).map((l) => l.energy!);
  const energyOnNonTrainDays = data.logs.filter((l) => !trainingDates.has(l.date) && l.energy !== null).map((l) => l.energy!);
  if (energyOnTrainDays.length >= 5 && energyOnNonTrainDays.length >= 5) {
    const avgTrain = energyOnTrainDays.reduce((s, e) => s + e, 0) / energyOnTrainDays.length;
    const avgNonTrain = energyOnNonTrainDays.reduce((s, e) => s + e, 0) / energyOnNonTrainDays.length;
    if (avgTrain - avgNonTrain > 1.5) patterns.push("You tend to train more often on days with higher energy. In your recorded data, training days appear associated with higher average energy.");
  }

  const overwhelmLogs = data.logs.filter((l) => l.overwhelm !== null);
  if (overwhelmLogs.length >= minDataPoints) {
    const highOverwhelmDays = overwhelmLogs.filter((l) => (l.overwhelm ?? 0) >= 7);
    const eventDates = new Set(data.events.map((e) => e.date));
    const highOverwhelmWithEvents = highOverwhelmDays.filter((l) => eventDates.has(l.date)).length;
    if (highOverwhelmDays.length >= 5 && highOverwhelmWithEvents / highOverwhelmDays.length >= 0.6) patterns.push("Your overwhelm appears higher on days with more logged events. There may be a pattern here in your recorded data.");
  }

  const hardDays = data.logs.filter((l) => l.daily_state === 'hard');
  if (hardDays.length >= 5) {
    const hardDayEvents = hardDays.map((l) => data.events.filter((e) => e.date === l.date)).flat();
    const buddyEvents = hardDayEvents.filter((e) => e.event_key === 'buddy_no_show').length;
    if (buddyEvents >= 2) patterns.push("You recorded several skipped workouts when your buddy wasn't available. This appears associated with accountability support in your data.");
  }

  const sleepLogs = data.logs.filter((l) => l.sleep_hours !== null);
  if (sleepLogs.length >= minDataPoints) {
    const lowSleepDays = sleepLogs.filter((l) => (l.sleep_hours ?? 0) < 6);
    const lowSleepTrainCount = lowSleepDays.filter((l) => trainingDates.has(l.date)).length;
    if (lowSleepDays.length >= 5 && lowSleepTrainCount / lowSleepDays.length < 0.3) patterns.push("Training appears less frequent after nights with less sleep. There may be a pattern here in your recorded data.");
  }

  const hardDayDates = new Set(hardDays.map((l) => l.date));
  const hardDaysWithWins = new Set([...data.training, ...data.nutrition, ...data.customActionLogs].filter((w) => hardDayDates.has(w.date)).map((w) => w.date)).size;
  if (hardDays.length >= 5 && hardDaysWithWins >= 3) {
    const pct = Math.round((hardDaysWithWins / hardDays.length) * 100);
    patterns.push(`On ${pct}% of your hard days, you still recorded a positive action. That's showing up when it counts.`);
  }

  // Cross-data: cycle vs training
  if (data.cycleLogs.length > 0 && data.training.length > 0) {
    const lutealWins = data.training.filter((t) => {
      const cycle = data.cycleLogs.find((c) => {
        const start = new Date(c.period_start_date);
        const d = new Date(t.date);
        const diff = Math.floor((d.getTime() - start.getTime()) / 86400000);
        return diff >= 17 && diff <= 28;
      });
      return cycle !== undefined;
    }).length;
    if (lutealWins >= 3) patterns.push(`You recorded ${lutealWins} training wins during your luteal phase. Your data shows you can show up even during the harder part of your cycle.`);
  }

  return patterns;
}

interface WeekStat {
  label: string;
  trainingCount: number;
  nutritionCount: number;
  difficultWinCount: number;
  loggedDays: number;
  prevWeek: WeekStat | null;
}

function computeWeeklyStats(data: MonthData): WeekStat[] {
  const weeks: WeekStat[] = [];
  const year = new Date(data.logs[0]?.date ?? new Date().toISOString()).getFullYear();
  const month = new Date(data.logs[0]?.date ?? new Date().toISOString()).getMonth();

  for (let w = 0; w < 5; w++) {
    const weekStart = new Date(year, month, 1 + w * 7);
    const weekEnd = new Date(year, month, 7 + w * 7);
    if (weekStart.getMonth() !== month) break;

    const ws = dateToString(weekStart);
    const we = dateToString(weekEnd);
    const weekLogs = data.logs.filter((l) => l.date >= ws && l.date <= we);
    const weekTrain = data.training.filter((t) => t.date >= ws && t.date <= we);
    const weekNut = data.nutrition.filter((n) => n.date >= ws && n.date <= we);
    const weekDiff = [...weekTrain, ...weekNut, ...data.customActionLogs.filter((l) => l.date >= ws && l.date <= we)].filter((w) => w.difficult_day_win).length;

    const prevWeekStart = new Date(year, month, 1 + w * 7 - 7);
    const prevWeekEnd = new Date(year, month, 7 + w * 7 - 7);
    const pws = dateToString(prevWeekStart);
    const pwe = dateToString(prevWeekEnd);
    const prevTrain = data.training.filter((t) => t.date >= pws && t.date <= pwe);
    const prevNut = data.nutrition.filter((n) => n.date >= pws && n.date <= pwe);

    weeks.push({
      label: `Week ${w + 1}`,
      trainingCount: weekTrain.length,
      nutritionCount: weekNut.length,
      difficultWinCount: weekDiff,
      loggedDays: weekLogs.length,
      prevWeek: w > 0 ? {
        label: `Week ${w}`,
        trainingCount: prevTrain.length,
        nutritionCount: prevNut.length,
        difficultWinCount: 0,
        loggedDays: 0,
        prevWeek: null,
      } : null,
    });
  }
  return weeks;
}

interface CycleStats {
  hasCycleData: boolean;
  cycleCount: number;
  avgCycleLength: number | null;
  avgPeriodLength: number | null;
  phaseBreakdown: { key: string; label: string; color: string; winCount: number }[];
  correlations: string[];
}

function computeCycleStats(data: MonthData): CycleStats {
  const cycleLogs = data.cycleLogs;
  if (cycleLogs.length === 0) {
    return { hasCycleData: false, cycleCount: 0, avgCycleLength: null, avgPeriodLength: null, phaseBreakdown: [], correlations: [] };
  }

  const cycleCount = cycleLogs.length;
  const cycleLengths = cycleLogs.filter((c) => c.cycle_length).map((c) => c.cycle_length!);
  const periodLengths = cycleLogs.filter((c) => c.period_length).map((c) => c.period_length!);
  const avgCycleLength = cycleLengths.length > 0 ? Math.round(cycleLengths.reduce((s, c) => s + c, 0) / cycleLengths.length) : null;
  const avgPeriodLength = periodLengths.length > 0 ? Math.round(periodLengths.reduce((s, c) => s + c, 0) / periodLengths.length) : null;

  // Assign each win to a cycle phase
  const phaseBreakdown = CYCLE_PHASES.map((phase) => {
    let winCount = 0;
    for (const win of [...data.training, ...data.nutrition, ...data.customActionLogs]) {
      for (const cycle of cycleLogs) {
        const start = new Date(cycle.period_start_date);
        const winDate = new Date(win.date);
        const dayDiff = Math.floor((winDate.getTime() - start.getTime()) / 86400000);
        if (dayDiff >= 0 && dayDiff <= (cycle.cycle_length ?? DEFAULT_CYCLE_LENGTH)) {
          const [min, max] = phase.dayRange;
          if (dayDiff >= min && dayDiff <= max) {
            winCount++;
            break;
          }
        }
      }
    }
    return { key: phase.key, label: phase.label, color: phase.color, winCount };
  });

  // Correlations
  const correlations: string[] = [];
  const lutealWins = phaseBreakdown.find((p) => p.key === 'luteal')?.winCount ?? 0;
  const follicularWins = phaseBreakdown.find((p) => p.key === 'follicular')?.winCount ?? 0;
  if (lutealWins > 0 || follicularWins > 0) {
    if (lutealWins > follicularWins) {
      correlations.push(`You recorded more positive actions during your luteal phase (${lutealWins}) than your follicular phase (${follicularWins}). You show up even when it's harder.`);
    } else if (follicularWins > lutealWins) {
      correlations.push(`You recorded more positive actions during your follicular phase (${follicularWins}) than your luteal phase (${lutealWins}). Your energy may be higher after your period.`);
    }
  }

  const menstrualWins = phaseBreakdown.find((p) => p.key === 'menstrual')?.winCount ?? 0;
  if (menstrualWins > 0) {
    correlations.push(`You recorded ${menstrualWins} positive action${menstrualWins > 1 ? 's' : ''} during your period. That takes real strength.`);
  }

  return { hasCycleData: true, cycleCount, avgCycleLength, avgPeriodLength, phaseBreakdown, correlations };
}
