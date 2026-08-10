const axios = require('axios');

// Wandbox API compiler names (free, no API key required)
const WANDBOX_COMPILERS = {
    c: 'gcc-13.2.0-c',
    python: 'cpython-3.12.7',
    java: 'openjdk-jdk-22+36'
};

/**
 * Execute code via Wandbox API (free open-source engine)
 */
const executeWithWandbox = async (sourceCode, language, testCases) => {
    const compiler = WANDBOX_COMPILERS[language];
    if (!compiler) {
        throw new Error(`Unsupported language: ${language}`);
    }

    // Java: Wandbox saves the code as prog.java, so 'public class Main' must become 'class Main'
    let codeToRun = sourceCode;
    if (language === 'java') {
        codeToRun = sourceCode.replace(/\bpublic\s+class\s+Main\b/, 'class Main');
    }

    const results = [];
    let passed = 0;
    let compilationError = null;

    for (const testCase of testCases) {
        try {
            const payload = {
                code: codeToRun,
                compiler,
                stdin: testCase.input
            };

            const response = await axios.post('https://wandbox.org/api/compile.json', payload, {
                timeout: 4000, // 4-second max timeout per test case
                headers: { 'Content-Type': 'application/json' }
            });

            const res = response.data;
            const stdout = (res.program_output || '').trim();
            const stderr = (res.compiler_error || res.compiler_message || res.program_error || '').trim();
            const expected = testCase.expectedOutput.trim();

            // Check for compilation error
            const isCompileError = Number(res.status) === 1 && !stdout;
            if (isCompileError) {
                compilationError = res.compiler_error || res.compiler_message || 'Compilation error';
            }

            // Runtime error: Wandbox reports it via program_error / program_message
            const isRuntimeError = !isCompileError && (res.program_error || res.program_message || (stderr && !stdout));

            // Time limit exceeded: submission ran at or above the 2s threshold
            const parsedTime = typeof res.time === 'string' ? parseFloat(res.time) : (res.time || 0);
            const isTLE = parsedTime >= 2;

            const isMatch = stdout === expected;
            if (isMatch) passed++;

            let status, statusId;
            if (isMatch) {
                status = 'Accepted';
                statusId = 3;
            } else if (isCompileError) {
                status = 'Compilation Error';
                statusId = 6;
            } else if (isTLE) {
                status = 'Time Limit Exceeded';
                statusId = 5;
            } else if (isRuntimeError) {
                status = 'Runtime Error';
                statusId = 8;
            } else {
                status = 'Wrong Answer';
                statusId = 4;
            }

            results.push({
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                actualOutput: stdout || (stderr ? `Error: ${stderr}` : ''),
                status,
                statusId,
                time: res.time || '0.05',
                memory: res.memory || 2048,
                passed: isMatch,
                error: stderr
            });
        } catch (err) {
            // Wandbox is unreachable or timed out. NEVER fabricate a pass —
            // the test case is a hard failure so no points can be earned fraudulently.
            console.warn(`Wandbox execution failed for test case: ${err.message}`);
            results.push({
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                actualOutput: `Execution error: ${err.message}`,
                status: 'Execution Error',
                statusId: 8,
                time: 0,
                memory: 0,
                passed: false,
                error: err.message
            });
        }
    }

    return {
        passed,
        total: testCases.length,
        results,
        compilationError,
        allPassed: passed === testCases.length
    };
};

const executeCode = async (sourceCode, language, testCases) => {
    if (!WANDBOX_COMPILERS[language]) {
        throw new Error(`Unsupported language: ${language}`);
    }
    return executeWithWandbox(sourceCode, language, testCases);
};

module.exports = { executeCode, WANDBOX_COMPILERS };