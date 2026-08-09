const { calculatePoints, getAIMultiplier, getDifficultyMultiplier, pointsToCurrency } = require('../services/rewardEngine');

describe('Reward Engine', () => {
  describe('getAIMultiplier', () => {
    it('returns 1.5 for scores >= 90', () => {
      expect(getAIMultiplier(90)).toBe(1.5);
      expect(getAIMultiplier(100)).toBe(1.5);
    });
    it('returns 1.3 for scores 80-89', () => {
      expect(getAIMultiplier(80)).toBe(1.3);
      expect(getAIMultiplier(89)).toBe(1.3);
    });
    it('returns 1.0 for scores 50-59', () => {
      expect(getAIMultiplier(50)).toBe(1.0);
      expect(getAIMultiplier(59)).toBe(1.0);
    });
    it('returns 0.4 for scores below 30', () => {
      expect(getAIMultiplier(0)).toBe(0.4);
      expect(getAIMultiplier(29)).toBe(0.4);
    });
  });

  describe('getDifficultyMultiplier', () => {
    it('returns 1.0 for easy', () => expect(getDifficultyMultiplier('easy')).toBe(1.0));
    it('returns 1.5 for medium', () => expect(getDifficultyMultiplier('medium')).toBe(1.5));
    it('returns 2.0 for hard', () => expect(getDifficultyMultiplier('hard')).toBe(2.0));
    it('returns 1.0 for unknown', () => expect(getDifficultyMultiplier('unknown')).toBe(1.0));
  });

  describe('calculatePoints', () => {
    it('gives 0 points when no test cases pass', () => {
      const { points } = calculatePoints({ basePoints: 100, testCasesPassed: 0, totalTestCases: 5, aiScore: 90, difficulty: 'easy' });
      expect(points).toBe(0);
    });

    it('calculates correct points for full pass + excellent AI on hard', () => {
      // 200 * (5/5) * 1.5 * 2.0 = 600
      const { points, breakdown } = calculatePoints({ basePoints: 200, testCasesPassed: 5, totalTestCases: 5, aiScore: 95, difficulty: 'hard' });
      expect(points).toBe(600);
      expect(breakdown.basePoints).toBe(200);
    });

    it('calculates partial credit for partial test case pass', () => {
      // 100 * (3/5) * 1.0 * 1.5 = 90
      const { points } = calculatePoints({ basePoints: 100, testCasesPassed: 3, totalTestCases: 5, aiScore: 55, difficulty: 'medium' });
      expect(points).toBe(90);
    });

    it('rounds points to nearest integer', () => {
      const { points } = calculatePoints({ basePoints: 100, testCasesPassed: 1, totalTestCases: 3, aiScore: 60, difficulty: 'easy' });
      expect(Number.isInteger(points)).toBe(true);
    });

    it('handles totalTestCases = 0 without dividing by zero', () => {
      const { points } = calculatePoints({ basePoints: 100, testCasesPassed: 0, totalTestCases: 0, aiScore: 80, difficulty: 'easy' });
      expect(points).toBe(0);
    });

    it('includes formula string in breakdown', () => {
      const { breakdown } = calculatePoints({ basePoints: 100, testCasesPassed: 5, totalTestCases: 5, aiScore: 80, difficulty: 'easy' });
      expect(breakdown.formula).toContain('=');
    });
  });

  describe('pointsToCurrency', () => {
    it('converts 100 points to ₹10', () => expect(pointsToCurrency(100)).toBe(10));
    it('converts 0 points to ₹0', () => expect(pointsToCurrency(0)).toBe(0));
    it('converts 1000 points to ₹100', () => expect(pointsToCurrency(1000)).toBe(100));
  });
});
