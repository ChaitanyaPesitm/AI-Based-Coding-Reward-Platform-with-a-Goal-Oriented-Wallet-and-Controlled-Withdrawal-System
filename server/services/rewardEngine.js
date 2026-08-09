/**
 * Reward Engine - Calculates points based on the formula from the synopsis:
 * Points = Base_Points × (Test_Cases_Passed / Total_Test_Cases) × AI_Efficiency_Multiplier
 */

/**
 * Get AI efficiency multiplier based on Gemini evaluation score
 * @param {number} aiScore - Score from 0-100
 * @returns {number} - Multiplier value
 */
const getAIMultiplier = (aiScore) => {
  if (aiScore >= 90) return 1.5;   // Excellent code quality
  if (aiScore >= 80) return 1.3;   // Very good
  if (aiScore >= 70) return 1.2;   // Good
  if (aiScore >= 60) return 1.1;   // Above average
  if (aiScore >= 50) return 1.0;   // Average
  if (aiScore >= 40) return 0.8;   // Below average
  if (aiScore >= 30) return 0.6;   // Poor
  return 0.4;                       // Very poor
};

/**
 * Get difficulty multiplier
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {number} - Multiplier value
 */
const getDifficultyMultiplier = (difficulty) => {
  switch (difficulty) {
    case 'easy': return 1.0;
    case 'medium': return 1.5;
    case 'hard': return 2.0;
    default: return 1.0;
  }
};

/**
 * Calculate reward points for a submission
 * @param {Object} params
 * @param {number} params.basePoints - Problem's base point value
 * @param {number} params.testCasesPassed - Number of test cases passed
 * @param {number} params.totalTestCases - Total number of test cases
 * @param {number} params.aiScore - AI evaluation score (0-100)
 * @param {string} params.difficulty - Problem difficulty
 * @returns {Object} - { points, breakdown }
 */
const calculatePoints = ({ basePoints, testCasesPassed, totalTestCases, aiScore, difficulty }) => {
  const testCaseRatio = totalTestCases > 0 ? testCasesPassed / totalTestCases : 0;
  const aiMultiplier = getAIMultiplier(aiScore);
  const diffMultiplier = getDifficultyMultiplier(difficulty);

  // Formula: Points = BasePoints × TestCaseRatio × AI_Multiplier × Difficulty_Multiplier
  const rawPoints = basePoints * testCaseRatio * aiMultiplier * diffMultiplier;
  const points = Math.round(rawPoints);

  return {
    points,
    breakdown: {
      basePoints,
      testCaseRatio: `${testCasesPassed}/${totalTestCases} (${Math.round(testCaseRatio * 100)}%)`,
      aiMultiplier: `${aiMultiplier}x (AI Score: ${aiScore}/100)`,
      difficultyMultiplier: `${diffMultiplier}x (${difficulty})`,
      formula: `${basePoints} × ${testCaseRatio.toFixed(2)} × ${aiMultiplier} × ${diffMultiplier} = ${points}`
    }
  };
};

/**
 * Convert points to currency (₹)
 * Rate: 100 points = ₹10
 */
const pointsToCurrency = (points) => {
  return (points / 100) * 10;
};

module.exports = { calculatePoints, pointsToCurrency, getAIMultiplier, getDifficultyMultiplier };
