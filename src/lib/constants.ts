import type { QuickEventConfig } from './types';

export const DEFAULT_QUICK_EVENTS: QuickEventConfig[] = [
  { key: 'skipped_gym', label: 'Skipped gym', icon: '🏋️' },
  { key: 'off_plan', label: 'Went off nutrition plan', icon: '🍔' },
  { key: 'overwhelmed', label: 'Overwhelmed', icon: '😵‍💫' },
  { key: 'couldnt_start', label: "Couldn't start", icon: '🧠' },
  { key: 'no_energy', label: 'No energy', icon: '💤' },
  { key: 'buddy_no_show', label: "Buddy didn't come", icon: '👥' },
  { key: 'too_much', label: 'Too much going on', icon: '📅' },
  { key: 'went_well', label: 'Something went really well', icon: '✨' },
];

export const DEFAULT_MOOD_OPTIONS = [
  'Good',
  'Neutral',
  'Tired',
  'Low',
  'Anxious',
];

export const DEFAULT_DAILY_STATE_LABELS: Record<string, string> = {
  good: 'Good',
  ok: 'OK',
  hard: 'Hard',
};

export const DEFAULT_TRAINING_WIN_TYPES = [
  'Full workout',
  'Short workout',
  'Minimum workout',
  'Walking / movement',
  'Other',
];

export const DEFAULT_NUTRITION_WIN_TYPES = [
  'Followed my plan',
  'Made a good choice in a difficult moment',
  'Got back on track after an unplanned choice',
  'Planned ahead',
  'Ate despite low motivation',
  'Other',
];

export const DIFFICULT_DAY_REASONS = [
  { key: 'gym', label: 'Gym', icon: '🏋️' },
  { key: 'food', label: 'Food', icon: '🍽️' },
  { key: 'overwhelmed', label: 'Overwhelmed', icon: '😵‍💫' },
  { key: 'couldnt_start', label: "Couldn't start", icon: '🧠' },
  { key: 'low_energy', label: 'Low energy', icon: '💤' },
  { key: 'sleep', label: 'Sleep', icon: '😴' },
  { key: 'people', label: 'People / accountability', icon: '👥' },
  { key: 'too_much', label: 'Too much going on', icon: '📅' },
  { key: 'other', label: 'Something else', icon: '➕' },
];

export const DIFFICULT_DAY_FEELINGS = [
  'Tired',
  'Overwhelmed',
  'Sad',
  'Empty',
  'Anxious',
  'Irritated',
  'Unmotivated',
  'Other',
];

export const DIFFICULT_DAY_HAPPENED = [
  'Tired and low energy',
  'Too many things at once',
  'Got interrupted',
  'Froze / could not start',
  'Plans changed unexpectedly',
  'Slept poorly',
  'Stress from outside the gym',
  'Other',
];

export const DIFFICULT_DAY_HELPED = [
  'Breaking it into smaller steps',
  'Lowering the bar',
  'Moving / going outside',
  'Asking for help',
  'Waiting and trying later',
  'Removing a distraction',
  'Eating something',
  'Other',
];

export const DIFFICULTY_LABELS: Record<string, string> = {
  no: 'Easy',
  a_little: 'A little difficult',
  very_difficult: 'Very difficult',
};

export const TRAINING_HELPING_FACTORS = [
  'Buddy',
  'Planned beforehand',
  'Music',
  'Motivation',
  'Accountability',
  'Just started',
  'Other',
];

export const NUTRITION_HELPING_FACTORS = [
  'Food was prepared',
  'Had a plan',
  'Accountability',
  'Easy option available',
  'Hunger was manageable',
  'Other',
];

export const SKIPPED_GYM_REASONS = [
  'Buddy didn\'t go',
  'Too tired',
  'Overwhelmed',
  'No time',
  'Forgot',
  'Didn\'t know what to do',
  'Didn\'t feel like leaving',
  'Something unexpected',
  'Other',
];

export const EVENT_FEELINGS = [
  'Tired',
  'Overwhelmed',
  'Frustrated',
  'Disappointed',
  'Anxious',
  'Neutral',
  'Other',
];

export const EVENT_HELP_OPTIONS = [
  'Going anyway',
  'Asking a friend',
  'Lowering the bar',
  'Trying later',
  'Planning ahead',
  'Removing a distraction',
  'Other',
];

export const DEFAULT_TOOLKIT_CATEGORIES = [
  { name: 'Gym', icon: '🏋️' },
  { name: 'Nutrition', icon: '🥗' },
  { name: 'Overwhelm', icon: '😵‍💫' },
  { name: 'Low energy', icon: '💤' },
  { name: 'Procrastination', icon: '🧠' },
  { name: 'Getting started', icon: '🚀' },
  { name: 'Planning', icon: '📅' },
  { name: 'Emotional regulation', icon: '🫶' },
];

export const DEFAULT_TOOLKIT_ITEMS = [
  {
    category: 'Gym',
    title: 'Minimum Gym Day',
    description: 'For days when getting to the gym feels impossible. The goal is just to show up.',
    steps: [
      'Put gym clothes on.',
      'Go to the gym.',
      'Start the first exercise.',
      'Continue only if you want to.',
    ],
    checklist: [],
  },
  {
    category: 'Getting started',
    title: '5-Minute Start',
    description: 'When you can\'t start, commit to just 5 minutes.',
    steps: [
      'Pick one small task.',
      'Set a timer for 5 minutes.',
      'Start working.',
      'When the timer goes off, decide if you want to continue.',
    ],
    checklist: [],
  },
  {
    category: 'Overwhelm',
    title: 'Brain Dump',
    description: 'Get everything out of your head and onto paper.',
    steps: [
      'Write down everything on your mind.',
      'Group items into categories.',
      'Pick ONE thing to do next.',
      'Put the rest aside for now.',
    ],
    checklist: [],
  },
  {
    category: 'Low energy',
    title: 'Energy Check',
    description: 'A quick check-in to understand what your body needs.',
    steps: [
      'Did you eat recently?',
      'Did you drink water?',
      'Did you sleep enough?',
      'Take one small action to address the biggest gap.',
    ],
    checklist: [],
  },
];

export const DEFAULT_CUSTOM_ACTIONS = [
  { title: 'I went for a walk', emoji: '🚶', category: 'Movement', counts_as_win: true },
  { title: 'I took a break', emoji: '🧘', category: 'Wellbeing', counts_as_win: true },
  { title: 'I prioritized sleep', emoji: '🛌', category: 'Wellbeing', counts_as_win: true },
  { title: 'I put my phone away', emoji: '📵', category: 'Focus', counts_as_win: true },
  { title: 'Something good', emoji: '✨', category: 'General', counts_as_win: false },
];

export const DEFAULT_REWARDS = [
  { title: 'Coffee from my favourite place', emoji: '☕', description: 'A small treat for showing up.', milestone: 10 },
  { title: 'Movie night', emoji: '🎬', description: 'Pick a movie and enjoy.', milestone: 25 },
  { title: 'Self-care day', emoji: '🛁', description: 'Do something kind for yourself.', milestone: 50 },
];

export const CYCLE_PHASES = [
  { key: 'menstrual', label: 'Menstrual', color: '#ef4444', dayRange: [0, 5] },
  { key: 'follicular', label: 'Follicular', color: '#22c55e', dayRange: [6, 13] },
  { key: 'ovulation', label: 'Ovulation', color: '#3b82f6', dayRange: [14, 16] },
  { key: 'luteal', label: 'Luteal', color: '#f59e0b', dayRange: [17, 28] },
];

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DEFAULT_CHECKIN_TIME = '20:00';
