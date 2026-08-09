/**
 * Local code complexity analyzer
 * Analyzes source code to estimate time and space complexity
 * Works as a fallback/companion to the Gemini AI evaluation
 */

// Detect nested loops, recursion, etc. to estimate time complexity
function analyzeTimeComplexity(code, language) {
    const lines = code.split('\n');
    let loopDepth = 0;
    let maxLoopDepth = 0;
    let hasRecursion = false;
    let hasSort = false;
    let hasBinarySearch = false;
    let hasHashMap = false;
    let hasDP = false;
    let hasTwoPointers = false;
    let hasDivideConquer = false;
    let hasGraphTraversal = false;
    let hasBacktracking = false;
    let hasSlidingWindow = false;
    let hasGreedy = false;
    let hasBitManipulation = false;
    let hasMathFormula = false;
    let hasMemoization = false;
    let hasTabulation = false;

    const lower = code.toLowerCase();

    // Detect recursion (function calling itself)
    const functionNames = [];
    const funcRegex = /(?:def|function|int|void|static|public|private|protected|returnType|auto)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    let match;
    while ((match = funcRegex.exec(code)) !== null) {
        functionNames.push(match[1]);
    }
    for (const name of functionNames) {
        const callRegex = new RegExp(`\\b${name}\\s*\\(`, 'g');
        let callMatch;
        while ((callMatch = callRegex.exec(code)) !== null) {
            // Check if the call is inside the function body (rough heuristic)
            const beforeCall = code.substring(0, callMatch.index);
            const lastDef = beforeCall.lastIndexOf(name);
            if (lastDef !== -1) {
                const afterDef = code.substring(lastDef);
                const braceCount = (afterDef.match(/\{/g) || []).length - (afterDef.match(/\}/g) || []).length;
                if (braceCount > 0) {
                    hasRecursion = true;
                    break;
                }
            }
        }
        if (hasRecursion) break;
    }

    // Detect loops
    for (const line of lines) {
        const trimmed = line.trim();
        if (/^(for|while)\s*\(/.test(trimmed) || /^for\s+/.test(trimmed) || /^while\s+/.test(trimmed)) {
            loopDepth++;
            maxLoopDepth = Math.max(maxLoopDepth, loopDepth);
        }
        // Close braces to reduce depth
        const openBraces = (trimmed.match(/\{/g) || []).length;
        const closeBraces = (trimmed.match(/\}/g) || []).length;
        loopDepth = Math.max(0, loopDepth + openBraces - closeBraces);
    }

    // Detect common algorithms
    if (/\b(sort|sorted|qsort|std::sort|Arrays\.sort|Collections\.sort)\s*\(/.test(lower)) hasSort = true;
    if (/\b(binary_search|binarySearch|lower_bound|upper_bound|bisect)\b/.test(lower)) hasBinarySearch = true;
    if (/\b(dict|HashMap|unordered_map|map|set|HashSet|unordered_set)\b/.test(lower)) hasHashMap = true;
    if (/\b(dp|dynamic|memo|memoization|tabulation|knapsack|lcs|lis|edit_distance|fib)\b/.test(lower)) hasDP = true;
    if (/\b(two.?pointer|left\s*=\s*0|right\s*=\s*n\s*-\s*1|i\s*=\s*0.*j\s*=\s*n)/.test(lower)) hasTwoPointers = true;
    if (/\b(merge.?sort|quick.?sort|divide|conquer|merge\s*\(|partition\s*\()/.test(lower)) hasDivideConquer = true;
    if (/\b(bfs|dfs|graph|adjacency|visited|queue|stack|dijkstra|floyd|bellman)/.test(lower)) hasGraphTraversal = true;
    if (/\b(backtrack|permutation|combination|subset|n.?queens|sudoku)/.test(lower)) hasBacktracking = true;
    if (/\b(sliding.?window|window|subarray|substring)/.test(lower)) hasSlidingWindow = true;
    if (/\b(greedy|interval|activity|huffman|fractional)/.test(lower)) hasGreedy = true;
    if (/\b(bit|mask|xor|shift|<<|>>|&|\\|)/.test(lower)) hasBitManipulation = true;
    if (/\b(gcd|lcm|prime|sieve|modulo|pow|sqrt|math\.)/.test(lower)) hasMathFormula = true;

    // Determine time complexity
    let timeComplexity;

    if (hasRecursion && hasDP) {
        timeComplexity = 'O(n)';
    } else if (hasRecursion && hasBacktracking) {
        timeComplexity = 'O(2^n)';
    } else if (hasRecursion) {
        timeComplexity = 'O(2^n)';
    } else if (hasSort && maxLoopDepth >= 2) {
        timeComplexity = 'O(n log n)';
    } else if (hasSort) {
        timeComplexity = 'O(n log n)';
    } else if (hasBinarySearch && maxLoopDepth >= 1) {
        timeComplexity = 'O(log n)';
    } else if (hasGraphTraversal) {
        timeComplexity = 'O(V + E)';
    } else if (hasDivideConquer) {
        timeComplexity = 'O(n log n)';
    } else if (hasDP) {
        timeComplexity = 'O(n²)';
    } else if (hasTwoPointers) {
        timeComplexity = 'O(n)';
    } else if (hasSlidingWindow) {
        timeComplexity = 'O(n)';
    } else if (hasGreedy) {
        timeComplexity = 'O(n log n)';
    } else if (hasBitManipulation) {
        timeComplexity = 'O(n)';
    } else if (hasMathFormula) {
        timeComplexity = 'O(1)';
    } else if (maxLoopDepth >= 3) {
        timeComplexity = 'O(n³)';
    } else if (maxLoopDepth === 2) {
        timeComplexity = 'O(n²)';
    } else if (maxLoopDepth === 1) {
        timeComplexity = 'O(n)';
    } else {
        timeComplexity = 'O(1)';
    }

    return timeComplexity;
}

// Analyze space complexity
function analyzeSpaceComplexity(code, language) {
    const lower = code.toLowerCase();
    let hasArray = false;
    let hasMatrix = false;
    let hasHashMap = false;
    let hasRecursion = false;
    let hasDP = false;
    let hasString = false;
    let hasStack = false;
    let hasQueue = false;
    let hasSet = false;
    let hasGraph = false;

    // Detect data structures
    if (/\b(array|vector|list|\[\]|new\s+int\[|new\s+char\[|malloc|calloc)\b/.test(lower)) hasArray = true;
    if (/\b(matrix|\[\]\[\]|vector<vector|2d|2-d|grid)\b/.test(lower)) hasMatrix = true;
    if (/\b(dict|HashMap|unordered_map|map|set|HashSet|unordered_set)\b/.test(lower)) hasHashMap = true;
    if (/\b(dp|memo|memoization|tabulation)\b/.test(lower)) hasDP = true;
    if (/\b(string|str|char\[\]|StringBuilder)\b/.test(lower)) hasString = true;
    if (/\b(stack|deque|priority_queue|heap)\b/.test(lower)) hasStack = true;
    if (/\b(queue|deque)\b/.test(lower)) hasQueue = true;
    if (/\b(graph|adjacency|visited|bfs|dfs)\b/.test(lower)) hasGraph = true;

    // Detect recursion for call stack
    const functionNames = [];
    const funcRegex = /(?:def|function|int|void|static|public|private|protected)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    let match;
    while ((match = funcRegex.exec(code)) !== null) {
        functionNames.push(match[1]);
    }
    for (const name of functionNames) {
        const callRegex = new RegExp(`\\b${name}\\s*\\(`, 'g');
        let callMatch;
        while ((callMatch = callRegex.exec(code)) !== null) {
            const beforeCall = code.substring(0, callMatch.index);
            const lastDef = beforeCall.lastIndexOf(name);
            if (lastDef !== -1) {
                const afterDef = code.substring(lastDef);
                const braceCount = (afterDef.match(/\{/g) || []).length - (afterDef.match(/\}/g) || []).length;
                if (braceCount > 0) {
                    hasRecursion = true;
                    break;
                }
            }
        }
        if (hasRecursion) break;
    }

    let spaceComplexity;

    if (hasMatrix) {
        spaceComplexity = 'O(n²)';
    } else if (hasDP) {
        spaceComplexity = 'O(n)';
    } else if (hasGraph) {
        spaceComplexity = 'O(V + E)';
    } else if (hasRecursion) {
        spaceComplexity = 'O(n)';
    } else if (hasHashMap || hasSet) {
        spaceComplexity = 'O(n)';
    } else if (hasArray || hasString || hasStack || hasQueue) {
        spaceComplexity = 'O(n)';
    } else {
        spaceComplexity = 'O(1)';
    }

    return spaceComplexity;
}

// Analyze code and return complexity info
function analyzeCode(code, language) {
    const timeComplexity = analyzeTimeComplexity(code, language);
    const spaceComplexity = analyzeSpaceComplexity(code, language);
    return { timeComplexity, spaceComplexity };
}

// Compare user's complexity with expected complexity
function compareComplexity(actual, expected) {
    if (!expected) return { isOptimal: true, message: 'No expected complexity specified' };

    const complexityRank = {
        'O(1)': 1,
        'O(log n)': 2,
        'O(n)': 3,
        'O(n log n)': 4,
        'O(n²)': 5,
        'O(n³)': 6,
        'O(2^n)': 7,
        'O(n!)': 8
    };

    const actualRank = complexityRank[actual] || 5;
    const expectedRank = complexityRank[expected] || 5;

    if (actualRank <= expectedRank) {
        return { isOptimal: true, message: `Your solution is optimal (${actual})` };
    } else {
        return {
            isOptimal: false,
            message: `Your solution (${actual}) is less efficient than expected (${expected}). Consider optimizing.`
        };
    }
}

module.exports = { analyzeCode, compareComplexity };