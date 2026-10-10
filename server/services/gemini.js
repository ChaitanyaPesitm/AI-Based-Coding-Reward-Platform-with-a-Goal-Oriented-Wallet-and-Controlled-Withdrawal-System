const axios = require('axios');

// Supported production Gemini model for generateContent
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

/**
 * Evaluate code quality using Google Gemini API
 * @param {string} sourceCode - The submitted code
 * @param {string} language - Programming language
 * @param {string} problemDescription - The problem statement
 * @param {number} testCasesPassed - Number of test cases passed
 * @param {number} totalTestCases - Total test cases
 * @returns {Object} - AI evaluation result
 */
const evaluateCode = async (sourceCode, language, problemDescription, testCasesPassed, totalTestCases) => {
  try {
    const prompt = `You are an expert code evaluator for a coding education platform. Analyze the following ${language.toUpperCase()} code solution and return a JSON evaluation.

PROBLEM:
${problemDescription}

SUBMITTED CODE:
\`\`\`${language}
${sourceCode}
\`\`\`

TEST RESULTS: ${testCasesPassed}/${totalTestCases} test cases passed.

Evaluate the code and return ONLY a valid JSON object (no markdown, no extra text) with these fields:
{
  "overallScore": <number 1-100>,
  "timeComplexity": "<Big-O notation, e.g., O(n), O(n^2)>",
  "spaceComplexity": "<Big-O notation, e.g., O(1), O(n)>",
  "codeQuality": <number 1-100>,
  "efficiency": <number 1-100>,
  "suggestions": "<brief improvement suggestion in 1-2 sentences>",
  "plagiarismRisk": <number 0-100, where 0 means original and 100 means likely copied>,
  "strengths": "<what the code does well in 1 sentence>"
}

Be fair but rigorous. If test cases failed, reduce overallScore proportionally. If the code is very short or trivial, give a moderate score. Check for common copied patterns.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // Extract the generated text
    const generatedText = response.data.candidates[0].content.parts[0].text;

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = generatedText;
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const evaluation = JSON.parse(jsonStr);

    return {
      success: true,
      aiScore: evaluation.overallScore || 50,
      timeComplexity: evaluation.timeComplexity || 'Unknown',
      spaceComplexity: evaluation.spaceComplexity || 'Unknown',
      codeQuality: evaluation.codeQuality || 50,
      efficiency: evaluation.efficiency || 50,
      suggestions: evaluation.suggestions || 'No suggestions available.',
      plagiarismRisk: evaluation.plagiarismRisk || 0,
      strengths: evaluation.strengths || ''
    };
  } catch (error) {
    console.error('Gemini API Error:', error.message);

    // Fallback: basic evaluation if API fails
    const passRatio = totalTestCases > 0 ? testCasesPassed / totalTestCases : 0;
    return {
      success: false,
      aiScore: Math.round(passRatio * 70), // Base score on pass ratio
      timeComplexity: 'Could not analyze',
      spaceComplexity: 'Could not analyze',
      codeQuality: Math.round(passRatio * 60),
      efficiency: Math.round(passRatio * 60),
      suggestions: 'AI evaluation temporarily unavailable. Score based on test case results.',
      plagiarismRisk: 0,
      strengths: testCasesPassed > 0 ? 'Code passes some test cases.' : ''
    };
  }
};

/**
 * Generate a Socratic conceptual hint using Google Gemini API
 * @param {string} sourceCode - The user's current code
 * @param {string} language - Programming language
 * @param {string} problemTitle - The problem title
 * @param {string} problemDescription - The problem statement
 * @returns {string} - AI generated hint
 */
const getSocraticHint = async (sourceCode, language, problemTitle, problemDescription) => {
  try {
    const prompt = `You are an expert Socratic AI mentor for a coding education platform. 
The user is trying to solve the problem "${problemTitle}". 
They have requested a hint.

PROBLEM:
${problemDescription}

THEIR CURRENT CODE:
\`\`\`${language}
${sourceCode}
\`\`\`

YOUR TASK:
Do NOT give them the direct answer or write code for them.
Instead, give a conceptual hint or ask a guiding question that points out a logical flaw or optimization in their current code. Keep it brief (1-3 sentences) and encouraging.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 150 }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const generatedText = response.data.candidates[0].content.parts[0].text;
    return generatedText.trim();
  } catch (error) {
    console.error('Gemini API Hint Error:', error.message);
    return 'Algorithmic Suggestion: Validate boundary constraints (e.g. empty or negative inputs). Break down the problem step-by-step before writing code!';
  }
};

/**
 * Generate 2 adversarial edge cases for a problem using Gemini
 * @param {string} problemTitle
 * @param {string} problemDescription
 * @param {string} language
 * @param {string} sampleInput - existing sample input format for reference
 * @returns {Array} - array of {input, expectedOutput} objects
 */
const generateEdgeCases = async (problemTitle, problemDescription, language, sampleInput) => {
  try {
    const prompt = `You are an adversarial test case generator for a competitive programming platform.

PROBLEM: "${problemTitle}"
DESCRIPTION: ${problemDescription}
LANGUAGE: ${language}
SAMPLE INPUT FORMAT: ${sampleInput || 'Not provided'}

Generate exactly 2 challenging edge test cases that a buggy solution might fail.
Focus on: empty inputs, boundary values, large numbers, negative numbers, single elements, or repeated values.

Return ONLY a valid JSON array (no markdown, no extra text):
[
  { "input": "<exact stdin string>", "expectedOutput": "<exact stdout string>" },
  { "input": "<exact stdin string>", "expectedOutput": "<exact stdout string>" }
]`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 512 }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const generatedText = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const cases = JSON.parse(jsonMatch[0]);
    // Validate structure
    return cases
      .filter(c => c.input !== undefined && c.expectedOutput !== undefined)
      .slice(0, 2);
  } catch (error) {
    console.error('Gemini Edge Case Error:', error.message);
    return [];
  }
};

/**
 * Generate a Senior Dev conceptual follow-up question after an accepted submission
 * @param {string} problemTitle
 * @param {string} sourceCode
 * @param {string} language
 * @param {string} timeComplexity
 * @returns {string} - The follow-up question
 */
const getSeniorDevQuestion = async (problemTitle, sourceCode, language, timeComplexity) => {
  try {
    const prompt = `You are a Senior Software Engineer conducting a code review.
The candidate just solved "${problemTitle}" in ${language} with ${timeComplexity} time complexity.

Their code:
\`\`\`${language}
${sourceCode.slice(0, 800)}
\`\`\`

Ask ONE short, challenging follow-up question (1-2 sentences) that tests their deeper understanding.
Topics: scalability, memory constraints, alternative approaches, or real-world edge cases.
Do NOT ask them to write code. Just ask the question directly.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 128 }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    return response.data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Gemini Senior Dev Question Error:', error.message);
    return `How would your solution handle it if the input was 10GB and couldn't fit in RAM?`;
  }
};

/**
 * Grade a user's answer to a Senior Dev follow-up question
 * @param {string} question - The question asked
 * @param {string} userAnswer - The user's text answer
 * @param {string} problemTitle
 * @returns {{ correct: boolean, feedback: string }}
 */
const gradeSeniorDevAnswer = async (question, userAnswer, problemTitle) => {
  try {
    const prompt = `You are a Senior Engineer grading a candidate's answer for "${problemTitle}".

QUESTION: ${question}
CANDIDATE'S ANSWER: ${userAnswer}

Evaluate if the answer demonstrates genuine conceptual understanding.
Return ONLY valid JSON (no markdown):
{ "correct": true/false, "feedback": "<1 sentence of constructive feedback>" }`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 128 }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { correct: false, feedback: 'Could not evaluate your answer.' };
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Gemini Grade Answer Error:', error.message);
    return { correct: false, feedback: 'Evaluation temporarily unavailable.' };
  }
};

/**
 * Rubber Duck Debugging Chat - AI mentor that NEVER writes code
 * @param {string} message - User's message/question
 * @param {string} code - Current code in editor (for context)
 * @param {string} language
 * @param {string} problemTitle
 * @param {Array} history - [{role:'user'|'assistant', content:string}] previous turns
 * @returns {string} - AI response
 */
const rubberDuckChat = async (message, code, language, problemTitle, history = []) => {
  try {
    const systemContext = `You are a Rubber Duck debugging partner for a coding platform.
The user is solving "${problemTitle}" in ${language}.
Their current code:
\`\`\`${language}
${(code || '').slice(0, 600)}
\`\`\`

STRICT RULES:
1. NEVER write, complete, or fix code for the user.
2. NEVER give direct answers.
3. Help by asking clarifying questions, pointing out logical contradictions, or suggesting they trace through their code step-by-step.
4. Be concise (2-3 sentences max).
5. Sound like a friendly but technically sharp colleague.`;

    // Build conversation parts
    const conversationParts = [{ text: systemContext + '\n\n' }];
    for (const turn of history.slice(-4)) { // keep last 4 turns for context
      conversationParts.push({ text: `${turn.role === 'user' ? 'User' : 'Duck'}: ${turn.content}\n` });
    }
    conversationParts.push({ text: `User: ${message}\nDuck:` });

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: conversationParts }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    return response.data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Rubber Duck Chat Error:', error.message);
    return "I'm having trouble connecting right now. Try explaining your logic out loud — what should happen at each step?";
  }
};

/**
 * Analyze if a submission is a style anomaly compared to user's historical average
 * @param {number} newAiScore - The AI score for the new submission
 * @param {number} newExecutionTime - Execution time in ms
 * @param {number} historicalAvgScore - User's average AI score from past submissions
 * @param {number} historicalAvgTime - User's average execution time
 * @param {number} submissionCount - Total submissions by user (need enough history)
 * @returns {{ isAnomaly: boolean, reason: string, severity: string }}
 */
const analyzeStyleAnomaly = (newAiScore, newExecutionTime, historicalAvgScore, historicalAvgTime, submissionCount) => {
  if (submissionCount < 5) {
    return { isAnomaly: false, reason: 'Insufficient history for style analysis', severity: 'none' };
  }

  const scoreDelta = newAiScore - historicalAvgScore;
  const timeDelta = historicalAvgTime > 0 ? ((historicalAvgTime - newExecutionTime) / historicalAvgTime) * 100 : 0;

  // Flag if score is 30+ points above historical average AND execution time is 60%+ faster
  if (scoreDelta >= 30 && timeDelta >= 60) {
    return {
      isAnomaly: true,
      reason: `Style anomaly: AI score jumped +${Math.round(scoreDelta)} pts above avg (${Math.round(historicalAvgScore)}) and ran ${Math.round(timeDelta)}% faster than usual`,
      severity: scoreDelta >= 45 ? 'high' : 'medium'
    };
  }

  // Flag if score is 40+ points above historical average alone
  if (scoreDelta >= 40) {
    return {
      isAnomaly: true,
      reason: `Style anomaly: AI score jumped +${Math.round(scoreDelta)} pts above historical average (${Math.round(historicalAvgScore)})`,
      severity: 'medium'
    };
  }

  return { isAnomaly: false, reason: 'Within normal style range', severity: 'none' };
};

module.exports = { evaluateCode, getSocraticHint, generateEdgeCases, getSeniorDevQuestion, gradeSeniorDevAnswer, rubberDuckChat, analyzeStyleAnomaly };
