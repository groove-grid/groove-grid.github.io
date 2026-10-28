/** Ticks per beat (AD-3). */
export const PPQ = 960

export const BPM_MIN = 30
export const BPM_MAX = 250

export const BEATS_MIN = 1
export const BEATS_MAX = 16

/** Seconds of audio the planner commits ahead of the clock (AD-7); the spike tunes it. */
export const LOOKAHEAD = 0.1

export const CLICK_SOUND_IDS = ['beep', 'woodblock', 'stick', 'hi-hat'] as const
export type ClickSoundId = (typeof CLICK_SOUND_IDS)[number]

export const MARKER_SOUND_IDS = ['clap', 'cowbell', 'conga'] as const
export type MarkerSoundId = (typeof MARKER_SOUND_IDS)[number]

/** Seconds between worker wake-ups that drive the planner (AD-7); the spike tunes it. */
export const WAKEUP_INTERVAL = 0.025

/** Seconds between the Start tap and beat 1 (AD-5); the spike tunes it. */
export const START_LEAD = 0.1

/** Vertical travel before a numeral drag starts changing tempo, and travel per BPM after that (UX-DR10). */
export const DRAG_THRESHOLD_PX = 8
export const DRAG_PX_PER_BPM = 6

/** Tap tempo averages up to this many intervals and forgets taps after this long a pause (FR12). */
export const TAP_MAX_INTERVALS = 4
export const TAP_RESET_MS = 2000
