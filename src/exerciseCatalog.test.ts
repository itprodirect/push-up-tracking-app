import { describe, expect, it } from 'vitest';
import { getExerciseCategory, normalizeExerciseName } from './exerciseCatalog';

describe('normalizeExerciseName', () => {
  it('returns the canonical name for an exact canonical match', () => {
    expect(normalizeExerciseName('Bench Press')).toBe('Bench Press');
  });

  it('normalizes a known alias to its canonical name', () => {
    expect(normalizeExerciseName('Bench')).toBe('Bench Press');
  });

  it('matches aliases case-insensitively', () => {
    expect(normalizeExerciseName('face pulls')).toBe('Face Pull');
  });

  it('trims whitespace before normalization', () => {
    expect(normalizeExerciseName(' free bench push ')).toBe('Bench Press');
  });

  it('normalizes additional known legacy variants', () => {
    expect(normalizeExerciseName('ISO Lat Pull free')).toBe('ISO-Lateral Pull');
    expect(normalizeExerciseName('Tricep extension')).toBe('Tricep Extension');
  });

  it('preserves unknown custom exercise names', () => {
    expect(normalizeExerciseName('My New Custom Exercise')).toBe('My New Custom Exercise');
  });
});

describe('getExerciseCategory', () => {
  it('returns the expected category for a canonical exercise', () => {
    expect(getExerciseCategory('Bench Press')).toBe('Chest / Push');
  });

  it('returns the expected category for an alias', () => {
    expect(getExerciseCategory('Bench')).toBe('Chest / Push');
  });

  it('matches aliases case-insensitively', () => {
    expect(getExerciseCategory('face pulls')).toBe('Shoulders');
  });

  it('trims whitespace before category lookup', () => {
    expect(getExerciseCategory(' free bench push ')).toBe('Chest / Push');
  });

  it('resolves additional known legacy variants', () => {
    expect(getExerciseCategory('ISO Lat Pull free')).toBe('Back / Pull');
    expect(getExerciseCategory('Mach rear delt')).toBe('Shoulders');
    expect(getExerciseCategory('Treadmill')).toBe('Cardio');
  });

  it('returns undefined for an unknown custom exercise', () => {
    expect(getExerciseCategory('My New Custom Exercise')).toBeUndefined();
  });
});
