const axios = require('axios');

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

module.exports = { evaluateCode };
