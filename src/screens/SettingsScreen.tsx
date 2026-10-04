import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { QuickEventConfig, CustomAction, Reward, CycleLog } from '@/lib/types';
import {
  DEFAULT_QUICK_EVENTS,
  DEFAULT_MOOD_OPTIONS,
  DEFAULT_DAILY_STATE_LABELS,
  DEFAULT_TRAINING_WIN_TYPES,
  DEFAULT_NUTRITION_WIN_TYPES,
  DEFAULT_CUSTOM_ACTIONS,
  DEFAULT_REWARDS,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
  MONTH_NAMES,
} from '@/lib/constants';
import {
  Plus, X, Trash2, Download, LogOut, ChevronRight, Check, GripVertical, Target, Gift, Star, Heart, Upload, Calendar,
} from 'lucide-react';
import { parseICSForPeriods } from '@/lib/ics';
import { useNotifications } from '@/lib/notifications';
import { DEFAULT_CHECKIN_TIME } from '@/lib/constants';
import { syncCycleFromICS } from '@/lib/cycleSync';
import { Bell, RefreshCw, Link2, Trash2 as TrashIcon } from 'lucide-react';

type Section = 'main' | 'quick_events' | 'mood' | 'state_labels' | 'training_types' | 'nutrition_types' | 'goals' | 'export' | 'custom_actions' | 'rewards' | 'cycle' | 'notifications';

export function SettingsScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [section, setSection] = useState<Section>('main');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function updateProfile(updates: Record<string, unknown>) {
    if (!user) return;
    await supabase.from('profiles').update(updates).eq('user_id', user.id);
    refreshProfile();
  }

  async function exportAllData() {
    if (!user) return;
    const [logs, training, nutrition, events, toolkitCats, toolkitItems, toolkitFiles, goals, customActions, customLogs, rewards, rewardClaims, cycleLogs] = await Promise.all([
      supabase.from('daily_logs').select('*').eq('user_id', user.id).order('date'),
      supabase.from('training_wins').select('*').eq('user_id', user.id).order('date'),
      supabase.from('nutrition_wins').select('*').eq('user_id', user.id).order('date'),
      supabase.from('events').select('*').eq('user_id', user.id).order('date'),
      supabase.from('toolkit_categories').select('*').eq('user_id', user.id),
      supabase.from('toolkit_items').select('*').eq('user_id', user.id),
      supabase.from('toolkit_files').select('*').eq('user_id', user.id),
      supabase.from('monthly_goals').select('*').eq('user_id', user.id),
      supabase.from('custom_actions').select('*').eq('user_id', user.id),
      supabase.from('custom_action_logs').select('*').eq('user_id', user.id),
      supabase.from('rewards').select('*').eq('user_id', user.id),
      supabase.from('reward_claims').select('*').eq('user_id', user.id),
      supabase.from('cycle_logs').select('*').eq('user_id', user.id),
    ]);

    const data = {
      exported_at: new Date().toISOString(),
      profile,
      daily_logs: logs.data,
      training_wins: training.data,
      nutrition_wins: nutrition.data,
      events: events.data,
      toolkit_categories: toolkitCats.data,
      toolkit_items: toolkitItems.data,
      toolkit_files: toolkitFiles.data,
      monthly_goals: goals.data,
      custom_actions: customActions.data,
      custom_action_logs: customLogs.data,
      rewards: rewards.data,
      reward_claims: rewardClaims.data,
      cycle_logs: cycleLogs.data,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-rhythm-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    if (!user) return;
    await Promise.all([
      supabase.from('daily_logs').delete().eq('user_id', user.id),
      supabase.from('training_wins').delete().eq('user_id', user.id),
      supabase.from('nutrition_wins').delete().eq('user_id', user.id),
      supabase.from('events').delete().eq('user_id', user.id),
      supabase.from('toolkit_items').delete().eq('user_id', user.id),
      supabase.from('toolkit_categories').delete().eq('user_id', user.id),
      supabase.from('toolkit_files').delete().eq('user_id', user.id),
      supabase.from('monthly_goals').delete().eq('user_id', user.id),
      supabase.from('custom_actions').delete().eq('user_id', user.id),
      supabase.from('custom_action_logs').delete().eq('user_id', user.id),
      supabase.from('rewards').delete().eq('user_id', user.id),
      supabase.from('reward_claims').delete().eq('user_id', user.id),
      supabase.from('cycle_logs').delete().eq('user_id', user.id),
      supabase.from('integration_settings').delete().eq('user_id', user.id),
      supabase.from('profiles').delete().eq('user_id', user.id),
    ]);
    await signOut();
  }

  if (section === 'quick_events') {
    return <QuickEventsEditor events={profile?.quick_events ?? DEFAULT_QUICK_EVENTS} onSave={(evts) => { updateProfile({ quick_events: evts }); setSection('main'); }} onBack={() => setSection('main')} />;
  }
  if (section === 'mood') {
    return <ListEditor title="Mood Options" items={profile?.mood_options ?? DEFAULT_MOOD_OPTIONS} onSave={(items) => { updateProfile({ mood_options: items }); setSection('main'); }} onBack={() => setSection('main')} />;
  }
  if (section === 'training_types') {
    return <ListEditor title="Training Win Types" items={profile?.training_win_types ?? DEFAULT_TRAINING_WIN_TYPES} onSave={(items) => { updateProfile({ training_win_types: items }); setSection('main'); }} onBack={() => setSection('main')} />;
  }
  if (section === 'nutrition_types') {
    return <ListEditor title="Nutrition Win Types" items={profile?.nutrition_win_types ?? DEFAULT_NUTRITION_WIN_TYPES} onSave={(items) => { updateProfile({ nutrition_win_types: items }); setSection('main'); }} onBack={() => setSection('main')} />;
  }
  if (section === 'state_labels') {
    return <StateLabelsEditor labels={profile?.daily_state_labels ?? DEFAULT_DAILY_STATE_LABELS} onSave={(labels) => { updateProfile({ daily_state_labels: labels }); setSection('main'); }} onBack={() => setSection('main')} />;
  }
  if (section === 'goals') {
    return <GoalsEditor onBack={() => setSection('main')} />;
  }
  if (section === 'custom_actions') {
    return <CustomActionsEditor onBack={() => setSection('main')} />;
  }
  if (section === 'rewards') {
    return <RewardsEditor onBack={() => setSection('main')} />;
  }
  if (section === 'cycle') {
    return <CycleEditor onBack={() => setSection('main')} />;
  }
  if (section === 'notifications') {
    return <NotificationsEditor onBack={() => setSection('main')} />;
  }
  if (section === 'export') {
    return (
      <div className="px-5 py-6 space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => setSection('main')} className="tap-target">
            <ChevronRight size={22} color="var(--color-text)" className="rotate-180" />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Export Data</h1>
        </div>
        <div className="card p-5 space-y-3">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Download all your data as a JSON file. This includes your daily logs, wins, events, toolkit, goals, custom actions, rewards, and cycle data.
          </p>
          <button onClick={exportAllData} className="btn-primary w-full flex items-center justify-center gap-2">
            <Download size={18} /> Download my data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Settings</h1>

      {/* Profile */}
      <div className="card p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary-light)' }}>
          <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
            {(profile?.display_name ?? user?.email ?? '?').charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{profile?.display_name ?? 'My Rhythm user'}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{user?.email}</p>
        </div>
      </div>

      {/* Positive actions & rewards */}
      <div className="space-y-2">
        <p className="section-title">Positive actions & rewards</p>
        <SettingsRow label="Custom positive actions" icon={<Star size={18} color="var(--color-warning)" />} onClick={() => setSection('custom_actions')} />
        <SettingsRow label="Reward milestones" icon={<Gift size={18} color="var(--color-primary)" />} onClick={() => setSection('rewards')} />
        <SettingsRow label="Cycle tracking" icon={<Heart size={18} color="var(--color-error)" />} onClick={() => setSection('cycle')} />
      </div>

      {/* Customization */}
      <div className="space-y-2">
        <p className="section-title">Customize</p>
        <SettingsRow label="Quick events" onClick={() => setSection('quick_events')} />
        <SettingsRow label="Mood options" onClick={() => setSection('mood')} />
        <SettingsRow label="Daily state labels" onClick={() => setSection('state_labels')} />
        <SettingsRow label="Training win types" onClick={() => setSection('training_types')} />
        <SettingsRow label="Nutrition win types" onClick={() => setSection('nutrition_types')} />
        <SettingsRow label="Monthly goals" onClick={() => setSection('goals')} />
      </div>

      {/* Notifications */}
      <div className="space-y-2">
        <p className="section-title">Reminders</p>
        <SettingsRow label="End-of-day check-in" icon={<Bell size={18} color="var(--color-primary)" />} onClick={() => setSection('notifications')} />
      </div>

      {/* Data */}
      <div className="space-y-2">
        <p className="section-title">Your data</p>
        <SettingsRow label="Export my data" icon={<Download size={18} color="var(--color-primary)" />} onClick={() => setSection('export')} />
        <SettingsRow label="Delete account" icon={<Trash2 size={18} color="var(--color-error)" />} onClick={() => setShowDeleteConfirm(true)} danger />
      </div>

      {/* Sign out */}
      <button onClick={signOut} className="btn-secondary w-full flex items-center justify-center gap-2">
        <LogOut size={18} /> Sign out
      </button>

      {/* About */}
      <div className="text-center pt-4">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>My Rhythm v2.0</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Built for flexible, compassionate self-tracking</p>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 space-y-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Delete account?</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              This will permanently delete all your data — daily logs, wins, events, toolkit, goals, custom actions, rewards, and cycle data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={deleteAccount} className="btn-primary flex-1" style={{ backgroundColor: 'var(--color-error)' }}>
                Delete everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsRow({ label, onClick, icon, danger }: { label: string; onClick: () => void; icon?: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} className="card p-4 flex items-center gap-3 w-full tap-target">
      {icon}
      <span className="text-sm font-medium flex-1 text-left" style={{ color: danger ? 'var(--color-error)' : 'var(--color-text)' }}>{label}</span>
      <ChevronRight size={18} color="var(--color-text-muted)" />
    </button>
  );
}

function QuickEventsEditor({ events, onSave, onBack }: { events: QuickEventConfig[]; onSave: (e: QuickEventConfig[]) => void; onBack: () => void }) {
  const [items, setItems] = useState<QuickEventConfig[]>(events);
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('');

  function add() {
    if (!newLabel.trim()) return;
    setItems([...items, { key: `custom_${Date.now()}`, label: newLabel.trim(), icon: newIcon.trim() || '📌' }]);
    setNewLabel('');
    setNewIcon('');
  }

  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="tap-target">
          <ChevronRight size={22} color="var(--color-text)" className="rotate-180" />
        </button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Quick Events</h1>
      </div>
      <div className="space-y-2">
        {items.map((evt, idx) => (
          <div key={idx} className="card p-3 flex items-center gap-3">
            <GripVertical size={16} color="var(--color-text-muted)" />
            <span className="text-xl">{evt.icon}</span>
            <input value={evt.label} onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, label: e.target.value } : it))} className="input-field flex-1" />
            <button onClick={() => setItems(items.filter((_, i) => i !== idx))}><X size={18} color="var(--color-error)" /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="Icon" className="input-field w-20" maxLength={2} />
        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="New event label" className="input-field flex-1" onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button onClick={add} className="btn-secondary"><Plus size={18} /></button>
      </div>
      <button onClick={() => onSave(items)} className="btn-primary w-full flex items-center justify-center gap-2"><Check size={18} /> Save</button>
    </div>
  );
}

function ListEditor({ title, items, onSave, onBack }: { title: string; items: string[]; onSave: (items: string[]) => void; onBack: () => void }) {
  const [list, setList] = useState(items);
  const [newItem, setNewItem] = useState('');

  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="tap-target"><ChevronRight size={22} color="var(--color-text)" className="rotate-180" /></button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{title}</h1>
      </div>
      <div className="space-y-2">
        {list.map((item, idx) => (
          <div key={idx} className="card p-3 flex items-center gap-2">
            <input value={item} onChange={(e) => setList(list.map((it, i) => i === idx ? e.target.value : it))} className="input-field flex-1" />
            <button onClick={() => setList(list.filter((_, i) => i !== idx))}><X size={18} color="var(--color-error)" /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add new option" className="input-field flex-1" onKeyDown={(e) => e.key === 'Enter' && newItem.trim() && (setList([...list, newItem.trim()]), setNewItem(''))} />
        <button onClick={() => { if (newItem.trim()) { setList([...list, newItem.trim()]); setNewItem(''); } }} className="btn-secondary"><Plus size={18} /></button>
      </div>
      <button onClick={() => onSave(list)} className="btn-primary w-full flex items-center justify-center gap-2"><Check size={18} /> Save</button>
    </div>
  );
}

function StateLabelsEditor({ labels, onSave, onBack }: { labels: Record<string, string>; onSave: (l: Record<string, string>) => void; onBack: () => void }) {
  const [vals, setVals] = useState(labels);
  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="tap-target"><ChevronRight size={22} color="var(--color-text)" className="rotate-180" /></button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Daily State Labels</h1>
      </div>
      <div className="space-y-3">
        {(['good', 'ok', 'hard'] as const).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-2xl">{key === 'good' ? '🟢' : key === 'ok' ? '🟡' : '🔴'}</span>
            <input value={vals[key] ?? ''} onChange={(e) => setVals({ ...vals, [key]: e.target.value })} className="input-field flex-1" />
          </div>
        ))}
      </div>
      <button onClick={() => onSave(vals)} className="btn-primary w-full flex items-center justify-center gap-2"><Check size={18} /> Save</button>
    </div>
  );
}

function GoalsEditor({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [trainingGoal, setTrainingGoal] = useState<number | null>(null);
  const [nutritionGoal, setNutritionGoal] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('monthly_goals').select('*').eq('user_id', user.id).eq('year', year).eq('month', month + 1).maybeSingle();
    if (data) {
      setTrainingGoal((data as { training_goal: number | null }).training_goal);
      setNutritionGoal((data as { nutrition_goal: number | null }).nutrition_goal);
      setNotes((data as { notes: string | null }).notes ?? '');
    } else { setTrainingGoal(null); setNutritionGoal(null); setNotes(''); }
    setLoading(false);
  }, [user, year, month]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!user) return;
    const { data: existing } = await supabase.from('monthly_goals').select('id').eq('user_id', user.id).eq('year', year).eq('month', month + 1).maybeSingle();
    if (existing) {
      await supabase.from('monthly_goals').update({ training_goal: trainingGoal, nutrition_goal: nutritionGoal, notes: notes || null }).eq('id', existing.id);
    } else {
      await supabase.from('monthly_goals').insert({ user_id: user.id, year, month: month + 1, training_goal: trainingGoal, nutrition_goal: nutritionGoal, notes: notes || null });
    }
    onBack();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="tap-target"><ChevronRight size={22} color="var(--color-text)" className="rotate-180" /></button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Monthly Goals</h1>
      </div>
      <div className="flex items-center justify-between">
        <button onClick={() => { setMonth(month === 0 ? 11 : month - 1); if (month === 0) setYear(year - 1); }} className="tap-target"><ChevronRight size={22} color="var(--color-text)" className="rotate-180" /></button>
        <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{MONTH_NAMES[month]} {year}</p>
        <button onClick={() => { setMonth(month === 11 ? 0 : month + 1); if (month === 11) setYear(year + 1); }} className="tap-target"><ChevronRight size={22} color="var(--color-text)" /></button>
      </div>
      <div className="card p-5 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-3"><Target size={18} color="var(--color-primary)" /><p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Training goal (%)</p></div>
          <div className="flex gap-1.5 flex-wrap">
            {[0,25,50,60,70,75,80,90,100].map((n) => (
              <button key={n} onClick={() => setTrainingGoal(trainingGoal === n ? null : n)} className={`px-3 py-2 rounded-lg text-sm font-semibold tap-target ${trainingGoal === n ? 'text-white' : 'bg-gray-100'}`} style={trainingGoal === n ? { backgroundColor: 'var(--color-primary)' } : {}}>{n}%</button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-3"><Target size={18} color="var(--color-accent)" /><p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Nutrition goal (%)</p></div>
          <div className="flex gap-1.5 flex-wrap">
            {[0,25,50,60,70,75,80,90,100].map((n) => (
              <button key={n} onClick={() => setNutritionGoal(nutritionGoal === n ? null : n)} className={`px-3 py-2 rounded-lg text-sm font-semibold tap-target ${nutritionGoal === n ? 'text-white' : 'bg-gray-100'}`} style={nutritionGoal === n ? { backgroundColor: 'var(--color-accent)' } : {}}>{n}%</button>
            ))}
          </div>
        </div>
        <div><p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Notes</p><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field min-h-[80px] resize-none" placeholder="Optional notes..." /></div>
      </div>
      <button onClick={save} className="btn-primary w-full flex items-center justify-center gap-2"><Check size={18} /> Save goals</button>
    </div>
  );
}

// =====================================================
// CUSTOM ACTIONS EDITOR
// =====================================================
function CustomActionsEditor({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [actions, setActions] = useState<CustomAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [newCountsAsWin, setNewCountsAsWin] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editCountsAsWin, setEditCountsAsWin] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('custom_actions').select('*').eq('user_id', user.id).order('display_order');
    setActions(data as CustomAction[] ?? []);
    if ((data as CustomAction[] ?? []).length === 0) {
      // Seed defaults
      const inserts = DEFAULT_CUSTOM_ACTIONS.map((a, i) => ({ user_id: user.id, title: a.title, emoji: a.emoji, category: a.category, counts_as_win: a.counts_as_win, display_order: i }));
      const { data: seeded } = await supabase.from('custom_actions').insert(inserts).select('*').order('display_order');
      setActions(seeded as CustomAction[] ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function addAction() {
    if (!user || !newTitle.trim()) return;
    const { data } = await supabase.from('custom_actions').insert({
      user_id: user.id,
      title: newTitle.trim(),
      emoji: newEmoji.trim() || '✨',
      counts_as_win: newCountsAsWin,
      display_order: actions.length,
    }).select('*').maybeSingle();
    if (data) setActions([...actions, data as CustomAction]);
    setNewTitle(''); setNewEmoji(''); setNewCountsAsWin(true);
  }

  async function updateAction(id: string) {
    const { data } = await supabase.from('custom_actions').update({
      title: editTitle.trim(),
      emoji: editEmoji.trim() || '✨',
      counts_as_win: editCountsAsWin,
    }).eq('id', id).select('*').maybeSingle();
    if (data) setActions(actions.map((a) => a.id === id ? data as CustomAction : a));
    setEditingId(null);
  }

  async function deleteAction(id: string) {
    await supabase.from('custom_actions').delete().eq('id', id);
    setActions(actions.filter((a) => a.id !== id));
  }

  async function duplicateAction(action: CustomAction) {
    if (!user) return;
    const { data } = await supabase.from('custom_actions').insert({
      user_id: user.id,
      title: `${action.title} (copy)`,
      emoji: action.emoji,
      category: action.category,
      counts_as_win: action.counts_as_win,
      display_order: actions.length,
    }).select('*').maybeSingle();
    if (data) setActions([...actions, data as CustomAction]);
  }

  async function toggleActive(action: CustomAction) {
    const { data } = await supabase.from('custom_actions').update({ active: !action.active }).eq('id', action.id).select('*').maybeSingle();
    if (data) setActions(actions.map((a) => a.id === action.id ? data as CustomAction : a));
  }

  async function moveAction(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= actions.length) return;
    const reordered = [...actions];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setActions(reordered);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('custom_actions').update({ display_order: i }).eq('id', reordered[i].id);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="tap-target"><ChevronRight size={22} color="var(--color-text)" className="rotate-180" /></button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Custom Actions</h1>
      </div>

      <div className="space-y-2">
        {actions.map((action, idx) => (
          <div key={action.id} className="card p-3 space-y-2">
            {editingId === action.id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input value={editEmoji} onChange={(e) => setEditEmoji(e.target.value)} className="input-field w-16 text-center" maxLength={2} />
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input-field flex-1" />
                </div>
                <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <input type="checkbox" checked={editCountsAsWin} onChange={(e) => setEditCountsAsWin(e.target.checked)} />
                  Counts as a win
                </label>
                <div className="flex gap-2">
                  <button onClick={() => updateAction(action.id)} className="btn-primary flex-1 text-sm">Save</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveAction(idx, -1)} disabled={idx === 0} className="text-xs" style={{ opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                  <button onClick={() => moveAction(idx, 1)} disabled={idx === actions.length - 1} className="text-xs" style={{ opacity: idx === actions.length - 1 ? 0.3 : 1 }}>▼</button>
                </div>
                <span className="text-2xl">{action.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: action.active ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{action.title}</p>
                  {action.counts_as_win && <span className="text-xs" style={{ color: 'var(--color-warning)' }}>Counts as win</span>}
                  {!action.active && <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>(hidden)</span>}
                </div>
                <button onClick={() => { setEditingId(action.id); setEditTitle(action.title); setEditEmoji(action.emoji); setEditCountsAsWin(action.counts_as_win); }} className="tap-target p-1 text-xs" style={{ color: 'var(--color-primary)' }}>Edit</button>
                <button onClick={() => duplicateAction(action)} className="tap-target p-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>Copy</button>
                <button onClick={() => toggleActive(action)} className="tap-target p-1 text-xs" style={{ color: action.active ? 'var(--color-text-muted)' : 'var(--color-success)' }}>{action.active ? 'Hide' : 'Show'}</button>
                <button onClick={() => deleteAction(action.id)} className="tap-target p-1"><Trash2 size={15} color="var(--color-error)" /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="card p-4 space-y-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Add new action</p>
        <div className="flex items-center gap-2">
          <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="Emoji" className="input-field w-20 text-center" maxLength={2} />
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Action title (e.g. I went for a walk)" className="input-field flex-1" onKeyDown={(e) => e.key === 'Enter' && addAction()} />
        </div>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <input type="checkbox" checked={newCountsAsWin} onChange={(e) => setNewCountsAsWin(e.target.checked)} />
          Counts as a win (adds to lifetime counter)
        </label>
        <button onClick={addAction} className="btn-secondary w-full flex items-center justify-center gap-2"><Plus size={18} /> Add action</button>
      </div>
    </div>
  );
}

// =====================================================
// REWARDS EDITOR
// =====================================================
function RewardsEditor({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [newMilestone, setNewMilestone] = useState('10');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editMilestone, setEditMilestone] = useState('10');
  const [editDescription, setEditDescription] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('rewards').select('*').eq('user_id', user.id).order('milestone');
    setRewards(data as Reward[] ?? []);
    if ((data as Reward[] ?? []).length === 0) {
      const inserts = DEFAULT_REWARDS.map((r) => ({ user_id: user.id, title: r.title, emoji: r.emoji, description: r.description, milestone: r.milestone }));
      const { data: seeded } = await supabase.from('rewards').insert(inserts).select('*').order('milestone');
      setRewards(seeded as Reward[] ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function addReward() {
    if (!user || !newTitle.trim()) return;
    const { data } = await supabase.from('rewards').insert({
      user_id: user.id,
      title: newTitle.trim(),
      emoji: newEmoji.trim() || '🎁',
      milestone: parseInt(newMilestone) || 10,
      description: newDescription.trim() || null,
    }).select('*').maybeSingle();
    if (data) {
      const updated = [...rewards, data as Reward].sort((a, b) => a.milestone - b.milestone);
      setRewards(updated);
    }
    setNewTitle(''); setNewEmoji(''); setNewMilestone('10'); setNewDescription('');
  }

  async function updateReward(id: string) {
    const { data } = await supabase.from('rewards').update({
      title: editTitle.trim(),
      emoji: editEmoji.trim() || '🎁',
      milestone: parseInt(editMilestone) || 10,
      description: editDescription.trim() || null,
    }).eq('id', id).select('*').maybeSingle();
    if (data) {
      const updated = rewards.map((r) => r.id === id ? data as Reward : r).sort((a, b) => a.milestone - b.milestone);
      setRewards(updated);
    }
    setEditingId(null);
  }

  async function deleteReward(id: string) {
    await supabase.from('rewards').delete().eq('id', id);
    setRewards(rewards.filter((r) => r.id !== id));
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="tap-target"><ChevronRight size={22} color="var(--color-text)" className="rotate-180" /></button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Reward Milestones</h1>
      </div>

      <div className="space-y-2">
        {rewards.map((reward) => (
          <div key={reward.id} className="card p-4 space-y-2">
            {editingId === reward.id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input value={editEmoji} onChange={(e) => setEditEmoji(e.target.value)} className="input-field w-16 text-center" maxLength={2} />
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input-field flex-1" />
                </div>
                <input type="number" value={editMilestone} onChange={(e) => setEditMilestone(e.target.value)} className="input-field" placeholder="Milestone (wins)" />
                <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="input-field" placeholder="Description (optional)" />
                <div className="flex gap-2">
                  <button onClick={() => updateReward(reward.id)} className="btn-primary flex-1 text-sm">Save</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-3xl">{reward.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{reward.title}</p>
                  <p className="text-xs" style={{ color: 'var(--color-primary)' }}>{reward.milestone} wins</p>
                  {reward.description && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{reward.description}</p>}
                </div>
                <button onClick={() => { setEditingId(reward.id); setEditTitle(reward.title); setEditEmoji(reward.emoji); setEditMilestone(String(reward.milestone)); setEditDescription(reward.description ?? ''); }} className="tap-target p-1 text-xs" style={{ color: 'var(--color-primary)' }}>Edit</button>
                <button onClick={() => deleteReward(reward.id)} className="tap-target p-1"><Trash2 size={15} color="var(--color-error)" /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="card p-4 space-y-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Add new reward</p>
        <div className="flex items-center gap-2">
          <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="Emoji" className="input-field w-20 text-center" maxLength={2} />
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Reward title" className="input-field flex-1" />
        </div>
        <input type="number" value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} className="input-field" placeholder="Milestone (wins needed)" />
        <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="input-field" placeholder="Description (optional)" />
        <button onClick={addReward} className="btn-secondary w-full flex items-center justify-center gap-2"><Plus size={18} /> Add reward</button>
      </div>
    </div>
  );
}

// =====================================================
// CYCLE EDITOR
// =====================================================
function CycleEditor({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [cycleLogs, setCycleLogs] = useState<CycleLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState('');
  const [newCycleLength, setNewCycleLength] = useState(String(DEFAULT_CYCLE_LENGTH));
  const [newPeriodLength, setNewPeriodLength] = useState(String(DEFAULT_PERIOD_LENGTH));
  const [newNotes, setNewNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCycleLength, setEditCycleLength] = useState('');
  const [editPeriodLength, setEditPeriodLength] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);

  const [icsUrl, setIcsUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ added: number; skipped: number; total: number; error?: string } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [cycleRes, integrationRes] = await Promise.all([
      supabase.from('cycle_logs').select('*').eq('user_id', user.id).order('period_start_date', { ascending: false }),
      supabase.from('integration_settings').select('*').eq('user_id', user.id).eq('integration_key', 'google_calendar_ics').maybeSingle(),
    ]);
    setCycleLogs(cycleRes.data as CycleLog[] ?? []);
    const integration = integrationRes.data as { enabled: boolean; settings: { ics_url?: string; last_synced_at?: string | null } } | null;
    if (integration?.settings?.ics_url) {
      setIcsUrl(integration.settings.ics_url);
      setAutoSyncEnabled(integration.enabled);
      setLastSyncedAt(integration.settings.last_synced_at ?? null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function saveIcsUrl() {
    if (!user || !icsUrl.trim()) return;
    await supabase.from('integration_settings').upsert({
      user_id: user.id,
      integration_key: 'google_calendar_ics',
      enabled: true,
      settings: { ics_url: icsUrl.trim(), last_synced_at: lastSyncedAt, last_sync_added: 0 },
    }, { onConflict: 'user_id,integration_key' });
    setAutoSyncEnabled(true);
  }

  async function syncNow() {
    if (!user || !icsUrl.trim()) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      await saveIcsUrl();
      const result = await syncCycleFromICS(user.id, icsUrl.trim());
      setSyncResult(result);
      if (!result.error) {
        setLastSyncedAt(new Date().toISOString());
        await load();
      }
    } catch {
      setSyncResult({ added: 0, skipped: 0, total: 0, error: 'Could not connect to your calendar.' });
    }
    setSyncing(false);
  }

  async function disableSync() {
    if (!user) return;
    await supabase.from('integration_settings').update({ enabled: false }).eq('user_id', user.id).eq('integration_key', 'google_calendar_ics');
    setAutoSyncEnabled(false);
  }

  async function removeSync() {
    if (!user) return;
    await supabase.from('integration_settings').delete().eq('user_id', user.id).eq('integration_key', 'google_calendar_ics');
    setIcsUrl('');
    setAutoSyncEnabled(false);
    setLastSyncedAt(null);
    setSyncResult(null);
  }

  async function addCycle() {
    if (!user || !newDate) return;
    const { data } = await supabase.from('cycle_logs').insert({
      user_id: user.id,
      period_start_date: newDate,
      cycle_length: parseInt(newCycleLength) || null,
      period_length: parseInt(newPeriodLength) || null,
      notes: newNotes.trim() || null,
    }).select('*').maybeSingle();
    if (data) {
      const updated = [data as CycleLog, ...cycleLogs].sort((a, b) => b.period_start_date.localeCompare(a.period_start_date));
      setCycleLogs(updated);
    }
    setNewDate(''); setNewCycleLength(String(DEFAULT_CYCLE_LENGTH)); setNewPeriodLength(String(DEFAULT_PERIOD_LENGTH)); setNewNotes('');
  }

  async function updateCycle(id: string) {
    const { data } = await supabase.from('cycle_logs').update({
      cycle_length: parseInt(editCycleLength) || null,
      period_length: parseInt(editPeriodLength) || null,
      notes: editNotes.trim() || null,
    }).eq('id', id).select('*').maybeSingle();
    if (data) setCycleLogs(cycleLogs.map((c) => c.id === id ? data as CycleLog : c));
    setEditingId(null);
  }

  async function deleteCycle(id: string) {
    await supabase.from('cycle_logs').delete().eq('id', id);
    setCycleLogs(cycleLogs.filter((c) => c.id !== id));
  }

  async function handleICSImport(file: File) {
    if (!user) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const periods = parseICSForPeriods(text);
      if (periods.length === 0) {
        setImportResult({ added: 0, skipped: 0 });
        setImporting(false);
        return;
      }
      const existingDates = new Set(cycleLogs.map((c) => c.period_start_date));
      const toInsert = periods.filter((p) => !existingDates.has(p.startDate));
      let added = 0;
      for (const p of toInsert) {
        const { data } = await supabase.from('cycle_logs').insert({
          user_id: user.id,
          period_start_date: p.startDate,
          cycle_length: parseInt(newCycleLength) || null,
          period_length: parseInt(newPeriodLength) || null,
          notes: `Imported from calendar: ${p.summary}`,
        }).select('*').maybeSingle();
        if (data) added++;
      }
      setImportResult({ added, skipped: periods.length - toInsert.length });
      load();
    } catch {
      setImportResult({ added: 0, skipped: 0 });
    }
    setImporting(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="tap-target"><ChevronRight size={22} color="var(--color-text)" className="rotate-180" /></button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Cycle Tracking</h1>
      </div>

      {/* Google Calendar auto-sync */}
      <div className="card p-4 space-y-3" style={{ backgroundColor: 'var(--color-primary-light)' }}>
        <div className="flex items-center gap-2">
          <Calendar size={20} color="var(--color-primary)" />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Sync with Google Calendar</p>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Paste your calendar's secret iCal link. We'll automatically import period events (events containing "period", "menstrual", or "cycle" in the title). Your cycle data updates every time you open this screen.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={icsUrl}
            onChange={(e) => setIcsUrl(e.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/..."
            className="input-field flex-1"
          />
          <button onClick={syncNow} disabled={syncing || !icsUrl.trim()} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>

        {autoSyncEnabled && (
          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>Auto-sync is on</span>
              {lastSyncedAt && (
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Last synced {new Date(lastSyncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              )}
            </div>
            <button onClick={removeSync} className="text-xs tap-target" style={{ color: 'var(--color-error)' }}>
              Remove
            </button>
          </div>
        )}

        {syncResult && (
          <div className="text-center pt-1">
            {syncResult.error ? (
              <p className="text-sm" style={{ color: 'var(--color-error)' }}>{syncResult.error}</p>
            ) : syncResult.added > 0 ? (
              <p className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
                Synced {syncResult.added} new period{syncResult.added === 1 ? '' : 's'}
                {syncResult.skipped > 0 ? ` (${syncResult.skipped} already existed)` : ''}
              </p>
            ) : syncResult.total > 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                All {syncResult.total} period{syncResult.total === 1 ? '' : 's'} were already imported.
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No period events found. Make sure your events include "period" or "menstrual" in the title.
              </p>
            )}
          </div>
        )}

        <details className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <summary className="cursor-pointer tap-target font-medium">How to get your iCal link</summary>
          <div className="mt-2 space-y-1 pl-2">
            <p>1. Open Google Calendar on a computer</p>
            <p>2. Find your period-tracking calendar in the left sidebar</p>
            <p>3. Click the three dots next to it &gt; Settings</p>
            <p>4. Scroll to "Secret address in iCal format"</p>
            <p>5. Copy and paste it above</p>
          </div>
        </details>
      </div>

      {/* Manual .ics import — still available as fallback */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Upload size={18} color="var(--color-text-muted)" />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Upload .ics file manually</p>
        </div>
        <label className="btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer tap-target">
          <Upload size={16} />
          {importing ? 'Importing...' : 'Choose .ics file'}
          <input
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleICSImport(file);
              e.target.value = '';
            }}
          />
        </label>
        {importResult && (
          <div className="text-center">
            {importResult.added > 0 ? (
              <p className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
                Imported {importResult.added} period{importResult.added === 1 ? '' : 's'}
                {importResult.skipped > 0 ? ` (${importResult.skipped} already existed)` : ''}
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                No period events found in the file.
              </p>
            )}
          </div>
        )}
      </div>

      {cycleLogs.length === 0 && (
        <div className="card p-5 text-center space-y-2">
          <Heart size={28} color="var(--color-error)" className="mx-auto" />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>No cycle data yet</p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Log your period start date to begin tracking your cycle and see cycle-aware insights.</p>
        </div>
      )}

      {/* Existing entries */}
      <div className="space-y-2">
        {cycleLogs.map((cycle) => (
          <div key={cycle.id} className="card p-4 space-y-2">
            {editingId === cycle.id ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{cycle.period_start_date}</p>
                <input type="number" value={editCycleLength} onChange={(e) => setEditCycleLength(e.target.value)} className="input-field" placeholder="Cycle length (days)" />
                <input type="number" value={editPeriodLength} onChange={(e) => setEditPeriodLength(e.target.value)} className="input-field" placeholder="Period length (days)" />
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="input-field min-h-[60px] resize-none" placeholder="Notes (optional)" />
                <div className="flex gap-2">
                  <button onClick={() => updateCycle(cycle.id)} className="btn-primary flex-1 text-sm">Save</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{cycle.period_start_date}</p>
                    {cycle.cycle_length && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Cycle: {cycle.cycle_length} days</p>}
                    {cycle.period_length && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Period: {cycle.period_length} days</p>}
                    {cycle.notes && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{cycle.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingId(cycle.id); setEditCycleLength(String(cycle.cycle_length ?? '')); setEditPeriodLength(String(cycle.period_length ?? '')); setEditNotes(cycle.notes ?? ''); }} className="tap-target p-1 text-xs" style={{ color: 'var(--color-primary)' }}>Edit</button>
                    <button onClick={() => deleteCycle(cycle.id)} className="tap-target p-1"><Trash2 size={15} color="var(--color-error)" /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new manually */}
      <div className="card p-4 space-y-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Log period start manually</p>
        <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="input-field" />
        <div className="flex gap-2">
          <input type="number" value={newCycleLength} onChange={(e) => setNewCycleLength(e.target.value)} className="input-field flex-1" placeholder="Cycle length" />
          <input type="number" value={newPeriodLength} onChange={(e) => setNewPeriodLength(e.target.value)} className="input-field flex-1" placeholder="Period length" />
        </div>
        <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="input-field min-h-[60px] resize-none" placeholder="Notes (optional)" />
        <button onClick={addCycle} disabled={!newDate} className="btn-primary w-full flex items-center justify-center gap-2"><Plus size={18} /> Add cycle entry</button>
      </div>
    </div>
  );
}

// =====================================================
// NOTIFICATIONS EDITOR
// =====================================================
function NotificationsEditor({ onBack }: { onBack: () => void }) {
  const {
    settings, permission, loading, pushSupported,
    requestPermission, recheckPermission: recheckFromHook,
    updateSettings, subscribeToPush, unsubscribeFromPush, hasPushSubscription,
  } = useNotifications();
  const [showExplanation, setShowExplanation] = useState(false);
  const [pendingEnable, setPendingEnable] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (settings?.checkin_enabled) {
      hasPushSubscription().then(setPushSubscribed);
    }
  }, [settings?.checkin_enabled, hasPushSubscription]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin" /></div>;
  }

  async function handleToggle() {
    if (!settings) return;
    if (!settings.checkin_enabled) {
      setShowExplanation(true);
      setPendingEnable(true);
    } else {
      await updateSettings({ checkin_enabled: false });
      await unsubscribeFromPush();
      setPushSubscribed(false);
    }
  }

  async function handleEnable() {
    if (!settings) return;
    setSubscribing(true);
    const result = await requestPermission();
    setShowExplanation(false);
    if (result === 'granted') {
      const subOk = await subscribeToPush();
      if (subOk) {
        await updateSettings({ checkin_enabled: true });
        setPushSubscribed(true);
      }
    }
    setPendingEnable(false);
    setSubscribing(false);
  }

  const isUnsupported = permission === 'unsupported' || !pushSupported;
  const isDenied = permission === 'denied';

  async function recheckPermission() {
    const current = recheckFromHook();
    if (current === 'granted' && pendingEnable) {
      const subOk = await subscribeToPush();
      if (subOk) {
        await updateSettings({ checkin_enabled: true });
        setPushSubscribed(true);
        setPendingEnable(false);
      }
    } else if (current === 'default') {
      const fresh = await requestPermission();
      if (fresh === 'granted' && pendingEnable) {
        const subOk = await subscribeToPush();
        if (subOk) {
          await updateSettings({ checkin_enabled: true });
          setPushSubscribed(true);
          setPendingEnable(false);
        }
      }
    }
  }

  return (
    <div className="px-5 py-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="tap-target">
          <ChevronRight size={22} color="var(--color-text)" className="rotate-180" />
        </button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Notifications</h1>
      </div>

      {/* End-of-day check-in toggle */}
      <div className="card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Bell size={20} color="var(--color-primary)" />
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>End-of-day check-in</p>
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
              A gentle reminder at the end of the day to record how things went.
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={isUnsupported}
            className="relative w-12 h-7 rounded-full tap-target transition-all"
            style={{
              backgroundColor: settings?.checkin_enabled ? 'var(--color-primary)' : '#d1d5db',
              opacity: isUnsupported ? 0.4 : 1,
            }}
          >
            <div
              className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all"
              style={{ left: settings?.checkin_enabled ? '22px' : '2px' }}
            />
          </button>
        </div>

        {/* Time picker */}
        {settings?.checkin_enabled && (
          <div className="animate-slide-up">
            <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
              <p className="text-sm font-medium flex-1" style={{ color: 'var(--color-text)' }}>Reminder time</p>
              <input
                type="time"
                value={settings.checkin_time}
                onChange={(e) => updateSettings({ checkin_time: e.target.value || DEFAULT_CHECKIN_TIME })}
                className="input-field w-32 text-center"
              />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
              One reminder per day maximum, even if you close the app.
            </p>
            {pushSubscribed && (
              <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                <Check size={12} /> Push notifications are active on this device.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Permission status */}
      {isUnsupported && (
        <div className="card p-4" style={{ backgroundColor: 'var(--color-warning-light)' }}>
          <p className="text-sm font-medium" style={{ color: '#92400e' }}>
            Push notifications are not supported on this device. Try Chrome or Edge on Android, or Chrome on desktop.
          </p>
        </div>
      )}
      {isDenied && (
        <div className="card p-4 space-y-3" style={{ backgroundColor: 'var(--color-error-light, #fee2e2)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>
            Notifications were blocked.
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            To re-enable on Android Chrome:
          </p>
          <ol className="text-xs space-y-1.5 pl-1" style={{ color: 'var(--color-text-muted)' }}>
            <li><span className="font-semibold">1.</span> Tap the three dots menu (top right of Chrome)</li>
            <li><span className="font-semibold">2.</span> Go to Settings &gt; Site settings &gt; Notifications</li>
            <li><span className="font-semibold">3.</span> Find this app's URL and set it to "Allowed"</li>
            <li><span className="font-semibold">4.</span> Come back here and tap "I've enabled it"</li>
          </ol>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Or: tap the lock/padlock icon next to the address bar &gt; Permissions &gt; Notifications &gt; Allow.
          </p>
          <button
            onClick={recheckPermission}
            className="btn-primary text-sm w-full"
          >
            I've enabled it, check again
          </button>
        </div>
      )}

      {/* Permission explanation modal */}
      {showExplanation && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 animate-fade-in" onClick={() => setShowExplanation(false)}>
          <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-6 space-y-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Bell size={24} color="var(--color-primary)" />
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Enable push notifications?</h3>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Get a gentle daily reminder to record how your day went — even when this app isn't open. We'll only send one reminder per day, and you can turn it off anytime.
            </p>
            {!isDenied && (
              <div className="flex gap-3">
                <button onClick={() => setShowExplanation(false)} className="btn-secondary flex-1">Not now</button>
                <button onClick={handleEnable} disabled={subscribing} className="btn-primary flex-1">
                  {subscribing ? 'Enabling...' : 'Allow'}
                </button>
              </div>
            )}
            {isDenied && (
              <div className="space-y-3">
                <p className="text-xs font-medium" style={{ color: 'var(--color-error)' }}>
                  You previously blocked notifications. Follow the steps below to re-enable, then tap "Check again".
                </p>
                <button onClick={() => { setShowExplanation(false); setPendingEnable(true); }} className="btn-primary w-full">Show me how</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="card p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>How it works</p>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>At your chosen time, you'll get a push notification asking how your day went — even if the app is closed. Tap it to open a quick check-in.</p>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>One reminder per day, no guilt trips. You can turn it off anytime.</p>
      </div>
    </div>
  );
}
