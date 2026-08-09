const User = require('../models/User');
const Problem = require('../models/Problem');

const initialProblems = [
  // ─── C PROBLEMS ──────────────────────────────────────────────────────────
  {
    title: 'Sum of Two Numbers',
    description: 'Write a C program that reads two integers from standard input and prints their sum.\n\n**Input Format:** Two integers separated by a space.\n**Output Format:** A single integer — the sum of the two numbers.',
    difficulty: 'easy',
    basePoints: 100,
    language: 'c',
    starterCode: '#include <stdio.h>\n\nint main() {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) {\n        printf("%d\\n", a + b);\n    }\n    return 0;\n}',
    constraints: '−10^9 ≤ a, b ≤ 10^9',
    sampleInput: '3 5',
    sampleOutput: '8',
    testCases: [
      { input: '3 5', expectedOutput: '8' },
      { input: '0 0', expectedOutput: '0' },
      { input: '-1 1', expectedOutput: '0' },
      { input: '100 200', expectedOutput: '300' }
    ]
  },
  {
    title: 'Factorial Calculator',
    description: 'Write a C program to calculate the factorial of a given non-negative integer N.\n\n**Input Format:** A single integer N (0 ≤ N ≤ 12).\n**Output Format:** A single integer — N! (N factorial).',
    difficulty: 'easy',
    basePoints: 100,
    language: 'c',
    starterCode: '#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        long long fact = 1;\n        for (int i = 1; i <= n; i++) fact *= i;\n        printf("%lld\\n", fact);\n    }\n    return 0;\n}',
    constraints: '0 ≤ N ≤ 12',
    sampleInput: '5',
    sampleOutput: '120',
    testCases: [
      { input: '5', expectedOutput: '120' },
      { input: '0', expectedOutput: '1' },
      { input: '1', expectedOutput: '1' }
    ]
  },
  {
    title: 'Reverse an Array',
    description: 'Write a C program that reads N integers and prints them in reverse order.\n\n**Input Format:** Integer N followed by N space-separated integers.\n**Output Format:** N space-separated integers in reverse order.',
    difficulty: 'medium',
    basePoints: 150,
    language: 'c',
    starterCode: '#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        int arr[100];\n        for(int i=0; i<n; i++) scanf("%d", &arr[i]);\n        for(int i=n-1; i>=0; i--) printf("%d%s", arr[i], i==0 ? "" : " ");\n        printf("\\n");\n    }\n    return 0;\n}',
    constraints: '1 ≤ N ≤ 100',
    sampleInput: '5\n1 2 3 4 5',
    sampleOutput: '5 4 3 2 1',
    testCases: [
      { input: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1' },
      { input: '3\n10 20 30', expectedOutput: '30 20 10' }
    ]
  },

  // ─── PYTHON PROBLEMS ──────────────────────────────────────────────────────
  {
    title: 'Palindrome Check',
    description: 'Write a Python program that reads a string and checks if it is a palindrome. Print "YES" if it is, "NO" otherwise.\n\n**Input Format:** A single string.\n**Output Format:** "YES" or "NO".',
    difficulty: 'easy',
    basePoints: 100,
    language: 'python',
    starterCode: 's = input().strip().lower()\nif s == s[::-1]:\n    print("YES")\nelse:\n    print("NO")\n',
    constraints: '1 ≤ len(s) ≤ 1000',
    sampleInput: 'racecar',
    sampleOutput: 'YES',
    testCases: [
      { input: 'racecar', expectedOutput: 'YES' },
      { input: 'hello', expectedOutput: 'NO' },
      { input: 'Madam', expectedOutput: 'YES' }
    ]
  },
  {
    title: 'Fibonacci Series',
    description: 'Write a Python program that outputs the first N Fibonacci numbers separated by space.\n\n**Input Format:** Single integer N (N ≥ 1).\n**Output Format:** N space-separated Fibonacci numbers.',
    difficulty: 'medium',
    basePoints: 150,
    language: 'python',
    starterCode: 'n = int(input().strip())\na, b = 0, 1\nres = []\nfor _ in range(n):\n    res.append(str(a))\n    a, b = b, a + b\nprint(" ".join(res))\n',
    constraints: '1 ≤ N ≤ 30',
    sampleInput: '5',
    sampleOutput: '0 1 1 2 3',
    testCases: [
      { input: '5', expectedOutput: '0 1 1 2 3' },
      { input: '1', expectedOutput: '0' }
    ]
  },

  // ─── JAVA PROBLEMS ────────────────────────────────────────────────────────
  {
    title: 'Even or Odd',
    description: 'Write a Java program that reads an integer and prints "Even" if it is even, or "Odd" if it is odd.\n\n**Input Format:** A single integer.\n**Output Format:** "Even" or "Odd".',
    difficulty: 'easy',
    basePoints: 100,
    language: 'java',
    starterCode: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            if (n % 2 == 0) System.out.println("Even");\n            else System.out.println("Odd");\n        }\n    }\n}',
    constraints: '−10^9 ≤ N ≤ 10^9',
    sampleInput: '4',
    sampleOutput: 'Even',
    testCases: [
      { input: '4', expectedOutput: 'Even' },
      { input: '7', expectedOutput: 'Odd' }
    ]
  },
  {
    title: 'Binary Search',
    description: 'Write a Java program to perform binary search on a sorted array. Print the 0-based index of the target integer, or -1 if not found.\n\n**Input Format:** First line N and T (target). Second line: N sorted integers.\n**Output Format:** 0-based index or -1.',
    difficulty: 'hard',
    basePoints: 200,
    language: 'java',
    starterCode: 'import java.util.Scanner;\nimport java.util.Arrays;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            int target = sc.nextInt();\n            int[] arr = new int[n];\n            for(int i=0; i<n; i++) arr[i] = sc.nextInt();\n            int idx = Arrays.binarySearch(arr, target);\n            System.out.println(idx >= 0 ? idx : -1);\n        }\n    }\n}',
    constraints: '1 ≤ N ≤ 10^5',
    sampleInput: '5 3\n1 2 3 4 5',
    sampleOutput: '2',
    testCases: [
      { input: '5 3\n1 2 3 4 5', expectedOutput: '2' },
      { input: '5 9\n1 2 3 4 5', expectedOutput: '-1' }
    ]
  }
];

const demoUsers = [
  { name: 'Admin User', email: 'admin@coderward.com', password: 'Admin@Code2026!', isAdmin: true, totalPointsEarned: 1250, problemsSolved: 12 },
  { name: 'Demo Student', email: 'student@example.com', password: 'Student@Code2026!', isAdmin: false, totalPointsEarned: 450, problemsSolved: 4 },
  { name: 'Rahul Sharma', email: 'rahul@example.com', password: 'Student@Code2026!', isAdmin: false, totalPointsEarned: 850, problemsSolved: 8 },
  { name: 'Deeksha Patel', email: 'deeksha@example.com', password: 'Student@Code2026!', isAdmin: false, totalPointsEarned: 1100, problemsSolved: 10 },
  { name: 'Anish Kumar', email: 'anish@example.com', password: 'Student@Code2026!', isAdmin: false, totalPointsEarned: 620, problemsSolved: 6 }
];

const autoSeed = async () => {
  try {
    // Seed users
    for (const u of demoUsers) {
      let existing = await User.findOne({ email: u.email });
      if (!existing) {
        await User.create(u);
        console.log(`👤 Auto-Seeded User (${u.name} - ${u.email})`);
      } else {
        // Update password if old password was simple
        existing.password = u.password;
        await existing.save();
      }
    }

    // Seed problems if count < 7
    const count = await Problem.countDocuments();
    if (count < initialProblems.length) {
      for (const p of initialProblems) {
        const pExists = await Problem.findOne({ title: p.title });
        if (!pExists) {
          await Problem.create(p);
        }
      }
      console.log(`✅ Auto-Seeded ${initialProblems.length} coding problems`);
    }
  } catch (err) {
    console.error('Auto-seed error:', err.message);
  }
};

module.exports = autoSeed;
