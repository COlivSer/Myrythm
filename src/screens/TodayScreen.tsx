import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { todayString } from '@/lib/date';
import type { DailyLog, DailyState, TrainingWin, NutritionWin, EventRow, Difficulty, CustomAction, CustomActionLog, Reward, RewardClaim } from '@/lib/types';
import {
  DIFFICULT_DAY_REASONS,
  DIFFICULT_DAY_FEELINGS,
  DIFFICULT_DAY_HAPPENED,
  DIFFICULT_DAY_HELPED,
  DIFFICULTY_LABELS,
  TRAINING_HELPING_FACTORS,
  NUTRITION_HELPING_FACTORS,
  SKIPPED_GYM_REASONS,
  EVENT_FEELINGS,
  EVENT_HELP_OPTIONS,
} from '@/lib/constants';
import { Dumbbell, Salad, Check, X, Sparkles, ChevronRight, ChevronDown, Star, Gift } from 'lucide-react';

type FlowState = 'initial' | 'good_optional' | 'ok_form' | 'hard_reasons' | 'hard_more_choice' | 'hard_feelings' | 'hard_happened' | 'hard_helped';

interface TodayScreenProps {
  onOpenToolkit: (category: string) => void;
  onLogged: () => void;
}

export function TodayScreen({ onOpenToolkit, onLogged }: TodayScreenProps) {
  const { user, profile } = useAuth();
  const [log, setLog] = useState<DailyLog | null>(null);
  const [trainingWins, setTrainingWins] = useState<TrainingWin[]>([]);
  const [nutritionWins, setNutritionWins] = useState<NutritionWin[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [customActions, setCustomActions] = useState<CustomAction[]>([]);
  const [customActionLogs, setCustomActionLogs] = useState<CustomActionLog[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardClaims, setRewardClaims] = useState<RewardClaim[]>([]);
  const [flow, setFlow] = useState<FlowState>('initial');
  const [loading, setLoading] = useState(true);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [milestoneReward, setMilestoneReward] = useState<Reward | null>(null);
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const [energy, setEnergy] = useState<number | null>(null);
  const [mood, setMood] = useState<string | null>(null);

  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [happenedText, setHappenedText] = useState('');
  const [helpedText, setHelpedText] = useState('');

  const [winContext, setWinContext] = useState<{ type: 'training' | 'nutrition'; winId: string } | null>(null);
  const [winType, setWinType] = useState<string | null>(null);
  const [winDifficulty, setWinDifficulty] = useState<Difficulty | null>(null);
  const [winHelpingFactors, setWinHelpingFactors] = useState<string[]>([]);
  const [winNotes, setWinNotes] = useState('');

  const [eventContext, setEventContext] = useState<EventRow | null>(null);
  const [eventReason, setEventReason] = useState<string | null>(null);
  const [eventFeelings, setEventFeelings] = useState<string[]>([]);
  const [eventHelpOptions, setEventHelpOptions] = useState<string[]>([]);
  const [eventNotes, setEventNotes] = useState('');

  const today = todayString();

  function flashSaved(msg: string) {
    setSavedFlash(msg);
    setTimeout(() => setSavedFlash(null), 1200);
  }

  const loadDayData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [logRes, trainRes, nutRes, evtRes, actionsRes, actionLogsRes, rewardsRes, claimsRes] = await Promise.all([
      supabase.from('daily_logs').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
      supabase.from('training_wins').select('*').eq('user_id', user.id).eq('date', today),
      supabase.from('nutrition_wins').select('*').eq('user_id', user.id).eq('date', today),
      supabase.from('events').select('*').eq('user_id', user.id).eq('date', today),
      supabase.from('custom_actions').select('*').eq('user_id', user.id).eq('active', true).order('display_order'),
      supabase.from('custom_action_logs').select('*').eq('user_id', user.id).eq('date', today),
      supabase.from('rewards').select('*').eq('user_id', user.id).eq('active', true).order('milestone'),
      supabase.from('reward_claims').select('*').eq('user_id', user.id).order('claimed_at'),
    ]);
    setLog(logRes.data as DailyLog | null);
    setTrainingWins(trainRes.data as TrainingWin[] ?? []);
    setNutritionWins(nutRes.data as NutritionWin[] ?? []);
    setEvents(evtRes.data as EventRow[] ?? []);
    setCustomActions(actionsRes.data as CustomAction[] ?? []);
    setCustomActionLogs(actionLogsRes.data as CustomActionLog[] ?? []);
    setRewards(rewardsRes.data as Reward[] ?? []);
    setRewardClaims(claimsRes.data as RewardClaim[] ?? []);
    setLoading(false);
  }, [user, today]);

  useEffect(() => {
    loadDayData();
  }, [loadDayData]);

  // Lifetime win count: training wins + nutrition wins + custom action logs where counts_as_win
  const lifetimeWins = trainingWins.length + nutritionWins.length + customActionLogs.filter((l) => {
    const action = customActions.find((a) => a.id === l.action_id);
    return action?.counts_as_win ?? true;
  }).length;

  // Check for milestone reached but not yet claimed
  useEffect(() => {
    if (rewards.length === 0) return;
    const claimedMilestones = new Set(rewardClaims.map((c) => {
      const r = rewards.find((rw) => rw.id === c.reward_id);
      return r?.milestone;
    }));
    for (const reward of rewards) {
      if (lifetimeWins >= reward.milestone && !claimedMilestones.has(reward.milestone)) {
        setMilestoneReward(reward);
        break;
      }
    }
  }, [lifetimeWins, rewards, rewardClaims]);

  async function saveDailyState(state: DailyState) {
    if (!user) return;
    if (log) {
      const { data } = await supabase.from('daily_logs').update({ daily_state: state }).eq('id', log.id).select('*').maybeSingle();
      if (data) setLog(data as DailyLog);
    } else {
      const { data } = await supabase.from('daily_logs').insert({ user_id: user.id, date: today, daily_state: state }).select('*').maybeSingle();
      if (data) setLog(data as DailyLog);
    }
    onLogged();
  }

  async function saveOkForm() {
    if (!user || !log) return;
    const updates: Record<string, unknown> = {};
    if (energy !== null) updates.energy = energy;
    if (mood !== null) updates.mood = mood;
    if (Object.keys(updates).length > 0) {
      const { data } = await supabase.from('daily_logs').update(updates).eq('id', log.id).select('*').maybeSingle();
      if (data) setLog(data as DailyLog);
    }
    flashSaved('Saved');
    setFlow('initial');
  }

  async function saveHardReasons(reasons: string[]) {
    if (!user) return;
    if (reasons.length > 0) {
      const rows = reasons.map((key) => {
        const reason = DIFFICULT_DAY_REASONS.find((r) => r.key === key);
        return { user_id: user.id, date: today, event_key: key, event_label: reason?.label ?? key, event_icon: reason?.icon ?? null };
      });
      await supabase.from('events').insert(rows);
      const { data: evtData } = await supabase.from('events').select('*').eq('user_id', user.id).eq('date', today);
      setEvents(evtData as EventRow[] ?? []);
    }
    setSelectedReasons(reasons);
  }

  async function saveHardFeelings(feelings: string[]) {
    if (!user || !log) return;
    await supabase.from('daily_logs').update({ mood: feelings.join(', ') }).eq('id', log.id).select('*').maybeSingle();
    setSelectedFeelings(feelings);
  }

  async function saveHardNotes() {
    if (!user || !log) return;
    const notes = [happenedText, helpedText].filter(Boolean).join('\n\n');
    if (notes) {
      const { data } = await supabase.from('daily_logs').update({ notes }).eq('id', log.id).select('*').maybeSingle();
      if (data) setLog(data as DailyLog);
    }
    flashSaved('Saved');
    setFlow('initial');
  }

  async function recordTrainingWin() {
    if (!user || submitting['training']) return;
    setSubmitting((s) => ({ ...s, training: true }));
    const isHardDay = log?.daily_state === 'hard';
    const { data } = await supabase.from('training_wins').insert({ user_id: user.id, date: today, difficult_day_win: isHardDay }).select('*').maybeSingle();
    if (data) {
      setTrainingWins((prev) => [...prev, data as TrainingWin]);
      onLogged();
      flashSaved('Win saved ✓');
    }
    setSubmitting((s) => ({ ...s, training: false }));
  }

  async function recordNutritionWin() {
    if (!user || submitting['nutrition']) return;
    setSubmitting((s) => ({ ...s, nutrition: true }));
    const isHardDay = log?.daily_state === 'hard';
    const { data } = await supabase.from('nutrition_wins').insert({ user_id: user.id, date: today, difficult_day_win: isHardDay }).select('*').maybeSingle();
    if (data) {
      setNutritionWins((prev) => [...prev, data as NutritionWin]);
      onLogged();
      flashSaved('Win saved ✓');
    }
    setSubmitting((s) => ({ ...s, nutrition: false }));
  }

  async function recordCustomAction(action: CustomAction) {
    if (!user || submitting[action.id]) return;
    setSubmitting((s) => ({ ...s, [action.id]: true }));
    const isHardDay = log?.daily_state === 'hard';
    const { data } = await supabase.from('custom_action_logs').insert({ user_id: user.id, action_id: action.id, date: today, difficult_day_win: isHardDay }).select('*').maybeSingle();
    if (data) {
      setCustomActionLogs((prev) => [...prev, data as CustomActionLog]);
      onLogged();
      flashSaved(action.counts_as_win ? 'Win saved ✓' : 'Saved');
    }
    setSubmitting((s) => ({ ...s, [action.id]: false }));
  }

  async function claimReward() {
    if (!user || !milestoneReward) return;
    await supabase.from('reward_claims').insert({ user_id: user.id, reward_id: milestoneReward.id, win_count_at_claim: lifetimeWins });
    const { data } = await supabase.from('reward_claims').select('*').eq('user_id', user.id).order('claimed_at');
    setRewardClaims(data as RewardClaim[] ?? []);
    setMilestoneReward(null);
    flashSaved('Reward claimed! 🎁');
  }

  async function saveWinContext() {
    if (!user || !winContext) return;
    const table = winContext.type === 'training' ? 'training_wins' : 'nutrition_wins';
    const updates: Record<string, unknown> = {};
    if (winType) updates.win_type = winType;
    if (winDifficulty) updates.difficulty = winDifficulty;
    updates.helping_factors = winHelpingFactors;
    if (winNotes.trim()) updates.notes = winNotes.trim();

    const { data } = await supabase.from(table).update(updates).eq('id', winContext.winId).select('*').maybeSingle();
    if (data) {
      if (winContext.type === 'training') {
        setTrainingWins((prev) => prev.map((w) => (w.id === data.id ? data as TrainingWin : w)));
      } else {
        setNutritionWins((prev) => prev.map((w) => (w.id === data.id ? data as NutritionWin : w)));
      }
    }
    setWinContext(null);
    setWinType(null);
    setWinDifficulty(null);
    setWinHelpingFactors([]);
    setWinNotes('');
  }

  async function recordGoodEvent() {
    if (!user) return;
    await supabase.from('events').insert({ user_id: user.id, date: today, event_key: 'went_well', event_label: 'Something went really well', event_icon: '✨' });
    const { data } = await supabase.from('events').select('*').eq('user_id', user.id).eq('date', today);
    setEvents(data as EventRow[] ?? []);
    flashSaved('Saved');
  }

  async function saveEventContext() {
    if (!user || !eventContext) return;
    const updates: Record<string, unknown> = {};
    if (eventReason) updates.suspected_reason = eventReason;
    if (eventFeelings.length > 0) updates.what_might_have_helped = eventFeelings.join(', ');
    if (eventHelpOptions.length > 0) updates.notes = eventHelpOptions.join(', ');
    if (Object.keys(updates).length > 0) {
      await supabase.from('events').update(updates).eq('id', eventContext.id);
      const { data } = await supabase.from('events').select('*').eq('user_id', user.id).eq('date', today);
      setEvents(data as EventRow[] ?? []);
    }
    setEventContext(null);
    setEventReason(null);
    setEventFeelings([]);
    setEventHelpOptions([]);
    setEventNotes('');
  }

  function checkContextualToolkit(reasonKeys: string[]) {
    const mapping: Record<string, string> = { gym: 'Gym', food: 'Nutrition', overwhelmed: 'Overwhelm', low_energy: 'Low energy', couldnt_start: 'Getting started' };
    for (const key of reasonKeys) {
      const cat = mapping[key];
      if (cat) { onOpenToolkit(cat); return; }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const hasLoggedToday = log !== null;
  const hasDifficultWin = [...trainingWins, ...nutritionWins, ...customActionLogs].some((w) => 'difficult_day_win' in w && w.difficult_day_win);

  // Count custom action logs by action_id
  const customActionCounts: Record<string, number> = {};
  for (const l of customActionLogs) {
    customActionCounts[l.action_id] = (customActionCounts[l.action_id] ?? 0) + 1;
  }

  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      {/* Saved flash */}
      {savedFlash && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] saved-flash">
          <div className="bg-white rounded-full px-5 py-2.5 flex items-center gap-2 shadow-lg" style={{ border: '1px solid var(--color-success)' }}>
            <Check size={18} color="var(--color-success)" strokeWidth={3} />
            <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{savedFlash}</span>
          </div>
        </div>
      )}

      {/* Milestone celebration */}
      {milestoneReward && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 animate-fade-in px-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4 animate-pop">
            <div className="text-5xl">{milestoneReward.emoji}</div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Milestone unlocked!</h2>
            <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>{milestoneReward.milestone} wins!</p>
            <div className="card p-4" style={{ backgroundColor: 'var(--color-warning-light)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{milestoneReward.emoji} {milestoneReward.title}</p>
              {milestoneReward.description && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{milestoneReward.description}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setMilestoneReward(null)} className="btn-secondary flex-1">Later</button>
              <button onClick={claimReward} className="btn-primary flex-1">Claim reward</button>
            </div>
          </div>
        </div>
      )}

      {/* Lifetime win counter */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-warning-light)' }}>
            <Star size={24} color="#f59e0b" fill="#f59e0b" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Lifetime wins</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{lifetimeWins}</p>
          </div>
        </div>
        {rewards.length > 0 && (
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Next: {rewards.find((r) => lifetimeWins < r.milestone)?.milestone ?? '—'}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Gift size={14} color="#f59e0b" />
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{rewardClaims.length} claimed</span>
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>TODAY</p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* State buttons */}
      {flow === 'initial' && (
        <div className="space-y-3 animate-slide-up">
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>How are you today?</h2>
          <div className="grid grid-cols-3 gap-3">
            <StateButton state="good" label={profile?.daily_state_labels?.good ?? 'Good'} emoji="🟢" selected={log?.daily_state === 'good'} onClick={() => { saveDailyState('good'); setFlow('good_optional'); }} />
            <StateButton state="ok" label={profile?.daily_state_labels?.ok ?? 'OK'} emoji="🟡" selected={log?.daily_state === 'ok'} onClick={() => { saveDailyState('ok'); setEnergy(log?.energy ?? null); setMood(log?.mood ?? null); setFlow('ok_form'); }} />
            <StateButton state="hard" label={profile?.daily_state_labels?.hard ?? 'Hard'} emoji="🔴" selected={log?.daily_state === 'hard'} onClick={() => { saveDailyState('hard'); setSelectedReasons([]); setSelectedFeelings([]); setHappenedText(''); setHelpedText(''); setFlow('hard_reasons'); }} />
          </div>

          {/* Difficult day win celebration */}
          {hasDifficultWin && (
            <div className="card p-4 flex items-center gap-3 animate-pop" style={{ backgroundColor: 'var(--color-success-light)' }}>
              <Star size={22} color="#f59e0b" fill="#f59e0b" />
              <p className="text-sm font-semibold" style={{ color: '#15803d' }}>You showed up on a difficult day.</p>
            </div>
          )}

          {/* Today's wins section */}
          <div className="space-y-3 pt-2">
            <p className="section-title">Today's wins</p>
            <div className="grid grid-cols-2 gap-3">
              <WinButton icon={<Dumbbell size={22} color="var(--color-primary)" />} label="I Trained" count={trainingWins.length} onClick={recordTrainingWin} />
              <WinButton icon={<Salad size={22} color="var(--color-accent)" />} label="I Ate on Plan" count={nutritionWins.length} onClick={recordNutritionWin} />
            </div>

            {/* Custom action buttons */}
            {customActions.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {customActions.map((action) => (
                  <WinButton
                    key={action.id}
                    icon={<span className="text-2xl">{action.emoji}</span>}
                    label={action.title}
                    count={customActionCounts[action.id] ?? 0}
                    onClick={() => recordCustomAction(action)}
                  />
                ))}
              </div>
            )}

            {/* Win context prompts */}
            {trainingWins.length > 0 && trainingWins[trainingWins.length - 1]?.win_type === null && !winContext && (
              <ContextPrompt text="Add context to your training?" onYes={() => setWinContext({ type: 'training', winId: trainingWins[trainingWins.length - 1].id })} />
            )}
            {nutritionWins.length > 0 && nutritionWins[nutritionWins.length - 1]?.win_type === null && !winContext && (
              <ContextPrompt text="Add context to your nutrition?" onYes={() => setWinContext({ type: 'nutrition', winId: nutritionWins[nutritionWins.length - 1].id })} />
            )}
          </div>

          {/* Something good */}
          <button onClick={recordGoodEvent} className="w-full card p-4 flex items-center gap-3 tap-target">
            <Sparkles size={20} color="var(--color-warning)" />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Something good</span>
            <ChevronRight size={18} className="ml-auto" color="var(--color-text-muted)" />
          </button>

          {/* Today's events */}
          {events.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="section-title">Today's events</p>
              <div className="flex flex-wrap gap-2">
                {events.map((evt) => (
                  <button key={evt.id} onClick={() => setEventContext(evt)} className="card px-3 py-2 text-sm flex items-center gap-1.5 tap-target">
                    {evt.event_icon && <span>{evt.event_icon}</span>}
                    <span style={{ color: 'var(--color-text)' }}>{evt.event_label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Daily summary */}
          {hasLoggedToday && (
            <div className="card overflow-hidden">
              <button onClick={() => setShowSummary(!showSummary)} className="w-full p-4 flex items-center justify-between tap-target">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Today's summary</span>
                {showSummary ? <ChevronDown size={18} color="var(--color-text-muted)" /> : <ChevronRight size={18} color="var(--color-text-muted)" />}
              </button>
              {showSummary && (
                <div className="px-4 pb-4 space-y-2 animate-slide-up">
                  <SummaryRow label="State" value={(log?.daily_state ?? '').charAt(0).toUpperCase() + log?.daily_state.slice(1)} color={log?.daily_state === 'good' ? '#22c55e' : log?.daily_state === 'ok' ? '#f59e0b' : '#ef4444'} />
                  {log?.energy !== null && log?.energy !== undefined && <SummaryRow label="Energy" value={`${log.energy}/10`} />}
                  {log?.overwhelm !== null && log?.overwhelm !== undefined && <SummaryRow label="Overwhelm" value={`${log.overwhelm}/10`} />}
                  {log?.mood && <SummaryRow label="Mood" value={log.mood} />}
                  {trainingWins.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <Dumbbell size={14} color="var(--color-primary)" />
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>{trainingWins.length} training win{trainingWins.length > 1 ? 's' : ''}</span>
                      {hasDifficultWin && <Star size={12} color="#f59e0b" fill="#f59e0b" />}
                    </div>
                  )}
                  {nutritionWins.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <Salad size={14} color="var(--color-accent)" />
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>{nutritionWins.length} nutrition win{nutritionWins.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {customActionLogs.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>{customActionLogs.length} custom action{customActionLogs.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {events.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{events.length} event{events.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* GOOD day optional */}
      {flow === 'good_optional' && (
        <div className="space-y-4 animate-slide-up">
          <div className="card p-5 text-center">
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Day saved</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Anything you want to record?</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <WinButton icon={<Dumbbell size={22} color="var(--color-primary)" />} label="I Trained" count={trainingWins.length} onClick={recordTrainingWin} full />
            <WinButton icon={<Salad size={22} color="var(--color-accent)" />} label="I Ate on Plan" count={nutritionWins.length} onClick={recordNutritionWin} full />
            {customActions.map((action) => (
              <WinButton key={action.id} icon={<span className="text-2xl">{action.emoji}</span>} label={action.title} count={customActionCounts[action.id] ?? 0} onClick={() => recordCustomAction(action)} full />
            ))}
            <button onClick={recordGoodEvent} className="card p-4 flex items-center gap-3 tap-target">
              <Sparkles size={22} color="var(--color-warning)" />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Something good</span>
            </button>
          </div>
          <button onClick={() => setFlow('initial')} className="btn-primary w-full">Done</button>
        </div>
      )}

      {/* OK day form */}
      {flow === 'ok_form' && (
        <div className="space-y-5 animate-slide-up">
          <div className="card p-5 space-y-5">
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Energy (optional)</p>
              <div className="flex gap-1.5 flex-wrap">
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <button key={n} onClick={() => setEnergy(energy === n ? null : n)} className={`w-9 h-9 rounded-xl text-sm font-semibold tap-target transition-all ${energy === n ? 'text-white' : 'bg-gray-100'}`} style={energy === n ? { backgroundColor: 'var(--color-primary)' } : {}}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Mood (optional)</p>
              <div className="flex flex-wrap gap-2">
                {(profile?.mood_options ?? ['Good','Neutral','Tired','Low','Anxious']).map((m) => (
                  <button key={m} onClick={() => setMood(mood === m ? null : m)} className={`px-4 py-2.5 rounded-xl text-sm font-medium tap-target transition-all ${mood === m ? 'text-white' : 'bg-gray-100'}`} style={mood === m ? { backgroundColor: 'var(--color-primary)' } : {}}>{m}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setFlow('initial')} className="btn-secondary flex-1">Skip</button>
            <button onClick={saveOkForm} className="btn-primary flex-1">Done</button>
          </div>
        </div>
      )}

      {/* HARD day flow */}
      {flow === 'hard_reasons' && (
        <div className="space-y-4 animate-slide-up">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>What made today hard? <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></p>
          <div className="grid grid-cols-2 gap-2.5">
            {DIFFICULT_DAY_REASONS.map((reason) => {
              const selected = selectedReasons.includes(reason.key);
              return (
                <button key={reason.key} onClick={() => { const next = selected ? selectedReasons.filter((r) => r !== reason.key) : [...selectedReasons, reason.key]; setSelectedReasons(next); }} className={`card p-3.5 flex items-center gap-2.5 tap-target transition-all ${selected ? 'ring-2' : ''}`} style={selected ? { borderColor: 'var(--color-primary)', boxShadow: '0 0 0 2px var(--color-primary)' } : {}}>
                  <span className="text-xl">{reason.icon}</span>
                  <span className="text-sm font-medium text-left" style={{ color: 'var(--color-text)' }}>{reason.label}</span>
                  {selected && <Check size={16} color="var(--color-primary)" className="ml-auto" />}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={async () => { await saveHardReasons(selectedReasons); if (selectedReasons.length > 0) checkContextualToolkit(selectedReasons); setFlow('hard_more_choice'); }} className="btn-primary flex-1">Continue</button>
            <button onClick={async () => { await saveHardReasons(selectedReasons); if (selectedReasons.length > 0) checkContextualToolkit(selectedReasons); flashSaved('Saved'); setFlow('initial'); }} className="btn-secondary flex-1">I'm done</button>
          </div>
        </div>
      )}

      {flow === 'hard_more_choice' && (
        <div className="space-y-4 animate-slide-up">
          <div className="card p-5 text-center">
            <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>Want to tell me more?</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setFlow('hard_feelings')} className="btn-primary flex-1">Yes</button>
            <button onClick={() => { flashSaved('Saved'); setFlow('initial'); }} className="btn-secondary flex-1">Not now</button>
          </div>
        </div>
      )}

      {flow === 'hard_feelings' && (
        <div className="space-y-4 animate-slide-up">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>How are you feeling? <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></p>
          <div className="flex flex-wrap gap-2">
            {DIFFICULT_DAY_FEELINGS.map((f) => {
              const selected = selectedFeelings.includes(f);
              return <button key={f} onClick={() => { const next = selected ? selectedFeelings.filter((x) => x !== f) : [...selectedFeelings, f]; setSelectedFeelings(next); }} className={`px-4 py-2.5 rounded-xl text-sm font-medium tap-target transition-all ${selected ? 'text-white' : 'bg-white border'}`} style={selected ? { backgroundColor: 'var(--color-primary)' } : { borderColor: 'var(--color-border)' }}>{f}</button>;
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={async () => { await saveHardFeelings(selectedFeelings); setFlow('hard_happened'); }} className="btn-primary flex-1">Continue</button>
            <button onClick={async () => { await saveHardFeelings(selectedFeelings); flashSaved('Saved'); setFlow('initial'); }} className="btn-secondary flex-1">I'm done</button>
          </div>
        </div>
      )}

      {flow === 'hard_happened' && (
        <div className="space-y-4 animate-slide-up">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>What do you think happened? <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></p>
          <div className="flex flex-wrap gap-2 mb-3">
            {DIFFICULT_DAY_HAPPENED.map((h) => <button key={h} onClick={() => setHappenedText((prev) => (prev ? prev + '\n' + h : h))} className="px-3.5 py-2 rounded-xl text-sm font-medium bg-white border tap-target" style={{ borderColor: 'var(--color-border)' }}>{h}</button>)}
          </div>
          <textarea value={happenedText} onChange={(e) => setHappenedText(e.target.value)} placeholder="Or write your own..." className="input-field min-h-[100px] resize-none" />
          <div className="flex gap-3">
            <button onClick={() => setFlow('hard_helped')} className="btn-primary flex-1">Continue</button>
            <button onClick={saveHardNotes} className="btn-secondary flex-1">I'm done</button>
          </div>
        </div>
      )}

      {flow === 'hard_helped' && (
        <div className="space-y-4 animate-slide-up">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>What might have helped? <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></p>
          <div className="flex flex-wrap gap-2 mb-3">
            {DIFFICULT_DAY_HELPED.map((h) => <button key={h} onClick={() => setHelpedText((prev) => (prev ? prev + '\n' + h : h))} className="px-3.5 py-2 rounded-xl text-sm font-medium bg-white border tap-target" style={{ borderColor: 'var(--color-border)' }}>{h}</button>)}
          </div>
          <textarea value={helpedText} onChange={(e) => setHelpedText(e.target.value)} placeholder="Or write your own..." className="input-field min-h-[100px] resize-none" />
          <button onClick={saveHardNotes} className="btn-primary w-full">I'm done</button>
        </div>
      )}

      {/* Win context modal */}
      {winContext && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={() => setWinContext(null)}>
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 space-y-5 animate-slide-up max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between sticky top-0 bg-white pb-2">
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Add context</h3>
              <button onClick={() => setWinContext(null)}><X size={22} color="var(--color-text-muted)" /></button>
            </div>
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Type</p>
              <div className="flex flex-wrap gap-2">
                {(winContext.type === 'training' ? (profile?.training_win_types ?? ['Full workout','Short workout','Minimum workout','Walking / movement','Other']) : (profile?.nutrition_win_types ?? ['Followed my plan','Made a good choice in a difficult moment','Got back on track after an unplanned choice','Planned ahead','Ate despite low motivation','Other'])).map((t) => <button key={t} onClick={() => setWinType(winType === t ? null : t)} className={`px-3.5 py-2 rounded-xl text-sm font-medium tap-target transition-all ${winType === t ? 'text-white' : 'bg-gray-100'}`} style={winType === t ? { backgroundColor: 'var(--color-primary)' } : {}}>{t}</button>)}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>How difficult was it today?</p>
              <div className="flex gap-2">
                {(['no','a_little','very_difficult'] as Difficulty[]).map((d) => <button key={d} onClick={() => setWinDifficulty(winDifficulty === d ? null : d)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium tap-target transition-all ${winDifficulty === d ? 'text-white' : 'bg-gray-100'}`} style={winDifficulty === d ? { backgroundColor: 'var(--color-primary)' } : {}}>{DIFFICULTY_LABELS[d]}</button>)}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Helping factors</p>
              <div className="flex flex-wrap gap-2">
                {(winContext.type === 'training' ? TRAINING_HELPING_FACTORS : NUTRITION_HELPING_FACTORS).map((f) => {
                  const selected = winHelpingFactors.includes(f);
                  return <button key={f} onClick={() => { const next = selected ? winHelpingFactors.filter((x) => x !== f) : [...winHelpingFactors, f]; setWinHelpingFactors(next); }} className={`px-3.5 py-2 rounded-xl text-sm font-medium tap-target transition-all ${selected ? 'text-white' : 'bg-gray-100'}`} style={selected ? { backgroundColor: 'var(--color-primary)' } : {}}>{f}</button>;
                })}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Notes (optional)</p>
              <textarea value={winNotes} onChange={(e) => setWinNotes(e.target.value)} className="input-field min-h-[60px] resize-none" placeholder="Anything else?" />
            </div>
            <button onClick={saveWinContext} className="btn-primary w-full">Save</button>
          </div>
        </div>
      )}

      {/* Event context modal */}
      {eventContext && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={() => setEventContext(null)}>
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 space-y-5 animate-slide-up max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between sticky top-0 bg-white pb-2">
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{eventContext.event_icon} {eventContext.event_label}</h3>
              <button onClick={() => setEventContext(null)}><X size={22} color="var(--color-text-muted)" /></button>
            </div>
            {eventContext.event_key === 'skipped_gym' && (
              <div>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>What do you think got in the way?</p>
                <div className="flex flex-wrap gap-2">
                  {SKIPPED_GYM_REASONS.map((r) => <button key={r} onClick={() => setEventReason(eventReason === r ? null : r)} className={`px-3.5 py-2 rounded-xl text-sm font-medium tap-target transition-all ${eventReason === r ? 'text-white' : 'bg-gray-100'}`} style={eventReason === r ? { backgroundColor: 'var(--color-primary)' } : {}}>{r}</button>)}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>How were you feeling?</p>
              <div className="flex flex-wrap gap-2">
                {EVENT_FEELINGS.map((f) => {
                  const selected = eventFeelings.includes(f);
                  return <button key={f} onClick={() => { const next = selected ? eventFeelings.filter((x) => x !== f) : [...eventFeelings, f]; setEventFeelings(next); }} className={`px-3.5 py-2 rounded-xl text-sm font-medium tap-target transition-all ${selected ? 'text-white' : 'bg-gray-100'}`} style={selected ? { backgroundColor: 'var(--color-primary)' } : {}}>{f}</button>;
                })}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>What might have helped?</p>
              <div className="flex flex-wrap gap-2">
                {EVENT_HELP_OPTIONS.map((h) => {
                  const selected = eventHelpOptions.includes(h);
                  return <button key={h} onClick={() => { const next = selected ? eventHelpOptions.filter((x) => x !== h) : [...eventHelpOptions, h]; setEventHelpOptions(next); }} className={`px-3.5 py-2 rounded-xl text-sm font-medium tap-target transition-all ${selected ? 'text-white' : 'bg-gray-100'}`} style={selected ? { backgroundColor: 'var(--color-primary)' } : {}}>{h}</button>;
                })}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Notes (optional)</p>
              <textarea value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} className="input-field min-h-[60px] resize-none" placeholder="Anything else?" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEventContext(null)} className="btn-secondary flex-1">Done</button>
              <button onClick={saveEventContext} className="btn-primary flex-1">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StateButton({ label, emoji, selected, onClick }: { state: DailyState; label: string; emoji: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`card p-5 flex flex-col items-center gap-2 tap-target transition-all ${selected ? 'ring-2' : ''}`} style={selected ? { borderColor: 'var(--color-primary)', boxShadow: '0 0 0 2px var(--color-primary)' } : {}}>
      <span className="text-3xl">{emoji}</span>
      <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{label}</span>
    </button>
  );
}

function WinButton({ icon, label, count, onClick, full }: { icon: ReactNode; label: string; count: number; onClick: () => void; full?: boolean }) {
  return (
    <button onClick={onClick} className={`card p-4 flex items-center gap-3 tap-target transition-all ${full ? 'w-full' : 'flex-col'}`} style={count > 0 ? { borderColor: 'var(--color-success)', boxShadow: '0 0 0 2px var(--color-success)' } : {}}>
      {icon}
      <div className={full ? 'flex-1 text-left' : ''}>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{label}</span>
        {count > 0 && <span className="text-xs ml-1" style={{ color: 'var(--color-success)' }}>x{count}</span>}
      </div>
      {count > 0 && !full && <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-success)' }}><Check size={12} color="white" strokeWidth={3} /></div>}
    </button>
  );
}

function ContextPrompt({ text, onYes }: { text: string; onYes: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="card p-3.5 space-y-2.5 animate-slide-up" style={{ backgroundColor: 'var(--color-primary-light)' }}>
      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{text}</p>
      <div className="flex gap-2">
        <button onClick={() => { setDismissed(true); onYes(); }} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white tap-target" style={{ backgroundColor: 'var(--color-primary)' }}>Add</button>
        <button onClick={() => setDismissed(true)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-white tap-target" style={{ color: 'var(--color-text-muted)' }}>Done</button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: color ?? 'var(--color-text)' }}>{value}</span>
    </div>
  );
}
