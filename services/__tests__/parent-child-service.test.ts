import { describe, expect, it } from 'vitest';
import { buildParentClassName, sanitizeInput } from '../parent-child-service';

describe('sanitizeInput', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizeInput('  hello world  ')).toBe('hello world');
  });

  it('collapses repeating spaces', () => {
    expect(sanitizeInput('hello    flexible   learner')).toBe('hello flexible learner');
  });
});

describe('buildParentClassName', () => {
  it('includes grade level when no class label is provided', () => {
    expect(
      buildParentClassName({
        schoolName: 'Ecole Horizon',
        gradeLevel: 'CM1' as any,
      })
    ).toBe('Ecole Horizon (CM1)');
  });

  it('prefers class label when provided', () => {
    expect(
      buildParentClassName({
        schoolName: 'Ecole Horizon',
        gradeLevel: 'CM2' as any,
        classLabel: 'Mme Dupont - CM2B',
      })
    ).toBe('Ecole Horizon — Mme Dupont - CM2B');
  });
});

