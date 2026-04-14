export const CANONICAL_EXERCISES = [
  'Bench Press',
  'Hammer Pullover',
  'Mid Row',
  'ISO-Lateral Incline Press',
  'ISO-Lateral Pull',
  'ISO-Lateral Wide Chest',
  'Hammer ISO Chest',
  'ISO Chest Push',
  'ISO Chest Pull',
  'Pec Fly',
  'Seated Machine Row',
  'Lat Pull',
  'Bicep Curl',
  'Face Pull',
  'Rope Pulldown',
  'Tricep Extension',
  'Machine Rear Delt',
  'Leg Press',
  'Hammer Strength Iso-Lateral Leg Press',
  'Leg Extension',
  'Prone Leg Curl',
  'Leg Curl (Quad)',
  'Leg Extension (Hamstring)',
  'Hip Abduction',
  'Treadmill Warm-Up',
  'Machine ISO-Lat Press',
  'Machine ISO-Lat Decline Chest Press',
] as const;

export const EXERCISE_CATEGORIES = [
  'Chest / Push',
  'Back / Pull',
  'Arms',
  'Shoulders',
  'Legs',
  'Cardio',
] as const;

export const EXERCISE_ALIASES: Record<string, CanonicalExerciseName> = {
  Bench: 'Bench Press',
  'Free bench': 'Bench Press',
  'Free bench push': 'Bench Press',
  'Hammer Pullover Pull': 'Hammer Pullover',
  'Mid rows': 'Mid Row',
  'Mid rows pull': 'Mid Row',
  'ISO Lat Incline press': 'ISO-Lateral Incline Press',
  'ISO-lateral incline press': 'ISO-Lateral Incline Press',
  'ISO Lat Pull free': 'ISO-Lateral Pull',
  'ISO Lat pull free - pull': 'ISO-Lateral Pull',
  'ISO lat wide Chest': 'ISO-Lateral Wide Chest',
  'Mach Hammer ISO Chest': 'Hammer ISO Chest',
  'ISO Chest Push': 'ISO Chest Push',
  'ISO Chest Pull': 'ISO Chest Pull',
  'Pec fly': 'Pec Fly',
  'Seated machine row push': 'Seated Machine Row',
  'Lat pull': 'Lat Pull',
  'Bicep curl pull': 'Bicep Curl',
  'Face pulls': 'Face Pull',
  'Rope pull down': 'Rope Pulldown',
  'Tricep extension': 'Tricep Extension',
  'Mach tri extension': 'Tricep Extension',
  'Mach rear delt': 'Machine Rear Delt',
  'Mach leg ext': 'Leg Extension',
  'Mach leg press': 'Leg Press',
  'Hammer Strength Iso-Lateral Leg Press': 'Hammer Strength Iso-Lateral Leg Press',
  'Prone Leg curl': 'Prone Leg Curl',
  'Mach leg curl - quad': 'Leg Curl (Quad)',
  'Leg extensions - hamstring': 'Leg Extension (Hamstring)',
  'Mach hip abduction': 'Hip Abduction',
  'Mach Iso-Lat Press': 'Machine ISO-Lat Press',
  'Mach ISO lat decline press Chest': 'Machine ISO-Lat Decline Chest Press',
  Treadmill: 'Treadmill Warm-Up',
};

export type CanonicalExerciseName = (typeof CANONICAL_EXERCISES)[number];
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const EXERCISE_CATEGORY_BY_CANONICAL: Record<CanonicalExerciseName, ExerciseCategory> = {
  'Bench Press': 'Chest / Push',
  'Hammer Pullover': 'Back / Pull',
  'Mid Row': 'Back / Pull',
  'ISO-Lateral Incline Press': 'Chest / Push',
  'ISO-Lateral Pull': 'Back / Pull',
  'ISO-Lateral Wide Chest': 'Chest / Push',
  'Hammer ISO Chest': 'Chest / Push',
  'ISO Chest Push': 'Chest / Push',
  'ISO Chest Pull': 'Back / Pull',
  'Pec Fly': 'Chest / Push',
  'Seated Machine Row': 'Back / Pull',
  'Lat Pull': 'Back / Pull',
  'Bicep Curl': 'Arms',
  'Face Pull': 'Shoulders',
  'Rope Pulldown': 'Arms',
  'Tricep Extension': 'Arms',
  'Machine Rear Delt': 'Shoulders',
  'Leg Press': 'Legs',
  'Hammer Strength Iso-Lateral Leg Press': 'Legs',
  'Leg Extension': 'Legs',
  'Prone Leg Curl': 'Legs',
  'Leg Curl (Quad)': 'Legs',
  'Leg Extension (Hamstring)': 'Legs',
  'Hip Abduction': 'Legs',
  'Treadmill Warm-Up': 'Cardio',
  'Machine ISO-Lat Press': 'Chest / Push',
  'Machine ISO-Lat Decline Chest Press': 'Chest / Push',
};

const canonicalLookup = new Map(CANONICAL_EXERCISES.map((name) => [normalizeKey(name), name]));
const aliasLookup = new Map(
  Object.entries(EXERCISE_ALIASES).map(([alias, canonical]) => [normalizeKey(alias), canonical]),
);

export function normalizeExerciseName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const normalized = normalizeKey(trimmed);
  return aliasLookup.get(normalized) ?? canonicalLookup.get(normalized) ?? trimmed;
}

export function getExerciseCategory(input: string): ExerciseCategory | undefined {
  const canonicalName = normalizeExerciseName(input);
  if (!canonicalName) return undefined;
  return EXERCISE_CATEGORY_BY_CANONICAL[canonicalName as CanonicalExerciseName];
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}
