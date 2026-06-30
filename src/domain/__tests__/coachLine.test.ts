import { deterministicHeadline } from '../coachLine';

describe('deterministicHeadline', () => {
  it('prompts to start logging when nothing has been logged today', () => {
    expect(deterministicHeadline(0, false)).toBe('Start with a glass of water to get going.');
  });

  it('returns an excellent-day line at the top of the scale', () => {
    expect(deterministicHeadline(95, true)).toBe("Excellent day — you're right on target.");
  });

  it('returns a solid-progress line in the high-but-not-excellent range', () => {
    expect(deterministicHeadline(75, true)).toBe('Solid progress today, keep it up.');
  });

  it('returns a halfway line in the mid range', () => {
    expect(deterministicHeadline(50, true)).toBe('Halfway there — a bit more logging fills the picture.');
  });

  it('returns an encouraging line for a low but logged score', () => {
    expect(deterministicHeadline(10, true)).toBe("Every log helps — let's build today's picture.");
  });
});
