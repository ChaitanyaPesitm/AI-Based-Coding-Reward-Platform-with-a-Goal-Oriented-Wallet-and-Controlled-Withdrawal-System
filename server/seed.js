const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const Problem = require('./models/Problem');

dotenv.config();

// Helper to create a problem object
const P = (title, description, difficulty, basePoints, language, starterCode, constraints, expectedTime, expectedSpace, category, sampleInput, sampleOutput, testCases) => ({
  title,
  description,
  difficulty,
  basePoints,
  language,
  starterCode,
  constraints,
  expectedTimeComplexity: expectedTime,
  expectedSpaceComplexity: expectedSpace,
  category,
  sampleInput,
  sampleOutput,
  testCases
});

// C starter code
const C_CODE = `#include <stdio.h>\n\nint main() {\n    // Write your code here\n    \n    return 0;\n}`;
// Python starter code
const PY_CODE = `# Write your code here\n`;
// Java starter code
const JAVA_CODE = `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your code here\n    }\n}`;

const seedProblems = [
  // ========== C EASY PROBLEMS (20) ==========
  P('Sum of Two Numbers', 'Write a C program that reads two integers and prints their sum.\n\n**Input:** Two integers a b.\n**Output:** Their sum.', 'easy', 100, 'c', C_CODE, '−10^9 ≤ a,b ≤ 10^9', 'O(1)', 'O(1)', 'math', '3 5', '8', [
    { input: '3 5', expectedOutput: '8' }, { input: '0 0', expectedOutput: '0' }, { input: '-1 1', expectedOutput: '0' }, { input: '100 200', expectedOutput: '300' }, { input: '-50 -30', expectedOutput: '-80' }
  ]),
  P('Factorial Calculator', 'Calculate the factorial of N.\n\n**Input:** Integer N (0 ≤ N ≤ 20).\n**Output:** N!', 'easy', 100, 'c', C_CODE, '0 ≤ N ≤ 20', 'O(n)', 'O(1)', 'math', '5', '120', [
    { input: '5', expectedOutput: '120' }, { input: '0', expectedOutput: '1' }, { input: '1', expectedOutput: '1' }, { input: '10', expectedOutput: '3628800' }, { input: '12', expectedOutput: '479001600' }
  ]),
  P('Reverse an Array', 'Read N integers and print them in reverse.\n\n**Input:** N then N integers.\n**Output:** Integers reversed.', 'easy', 100, 'c', C_CODE, '1 ≤ N ≤ 1000', 'O(n)', 'O(n)', 'array', '5\n1 2 3 4 5', '5 4 3 2 1', [
    { input: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1' }, { input: '1\n42', expectedOutput: '42' }, { input: '3\n10 20 30', expectedOutput: '30 20 10' }, { input: '4\n-1 0 1 2', expectedOutput: '2 1 0 -1' }, { input: '2\n7 8', expectedOutput: '8 7' }
  ]),
  P('Largest Element', 'Find the largest element in an array.\n\n**Input:** N then N integers.\n**Output:** The maximum value.', 'easy', 100, 'c', C_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'array', '5\n3 7 2 9 1', '9', [
    { input: '5\n3 7 2 9 1', expectedOutput: '9' }, { input: '1\n5', expectedOutput: '5' }, { input: '3\n-1 -5 -3', expectedOutput: '-1' }, { input: '4\n10 20 30 40', expectedOutput: '40' }, { input: '2\n100 50', expectedOutput: '100' }
  ]),
  P('Count Even Numbers', 'Count how many even numbers are in an array.\n\n**Input:** N then N integers.\n**Output:** Count of even numbers.', 'easy', 100, 'c', C_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'array', '5\n1 2 3 4 5', '2', [
    { input: '5\n1 2 3 4 5', expectedOutput: '2' }, { input: '3\n2 4 6', expectedOutput: '3' }, { input: '3\n1 3 5', expectedOutput: '0' }, { input: '1\n0', expectedOutput: '1' }, { input: '4\n-2 -1 0 1', expectedOutput: '2' }
  ]),
  P('Sum of Digits', 'Compute the sum of digits of a number.\n\n**Input:** Integer N.\n**Output:** Sum of its digits.', 'easy', 100, 'c', C_CODE, '0 ≤ N ≤ 10^9', 'O(log n)', 'O(1)', 'math', '12345', '15', [
    { input: '12345', expectedOutput: '15' }, { input: '0', expectedOutput: '0' }, { input: '999', expectedOutput: '27' }, { input: '100', expectedOutput: '1' }, { input: '7', expectedOutput: '7' }
  ]),
  P('Is Prime?', 'Check if a number is prime.\n\n**Input:** Integer N.\n**Output:** "YES" if prime, "NO" otherwise.', 'easy', 100, 'c', C_CODE, '2 ≤ N ≤ 10^6', 'O(√n)', 'O(1)', 'math', '7', 'YES', [
    { input: '7', expectedOutput: 'YES' }, { input: '10', expectedOutput: 'NO' }, { input: '2', expectedOutput: 'YES' }, { input: '1', expectedOutput: 'NO' }, { input: '97', expectedOutput: 'YES' }
  ]),
  P('GCD of Two Numbers', 'Find the GCD of two integers using Euclid\'s algorithm.\n\n**Input:** Two integers a b.\n**Output:** Their GCD.', 'easy', 100, 'c', C_CODE, '1 ≤ a,b ≤ 10^9', 'O(log min(a,b))', 'O(1)', 'math', '12 18', '6', [
    { input: '12 18', expectedOutput: '6' }, { input: '7 13', expectedOutput: '1' }, { input: '100 75', expectedOutput: '25' }, { input: '1 1', expectedOutput: '1' }, { input: '54 24', expectedOutput: '6' }
  ]),
  P('Armstrong Number', 'Check if a 3-digit number is an Armstrong number (sum of cubes of digits equals the number).\n\n**Input:** Integer N.\n**Output:** "YES" or "NO".', 'easy', 100, 'c', C_CODE, '100 ≤ N ≤ 999', 'O(1)', 'O(1)', 'math', '153', 'YES', [
    { input: '153', expectedOutput: 'YES' }, { input: '370', expectedOutput: 'YES' }, { input: '123', expectedOutput: 'NO' }, { input: '371', expectedOutput: 'YES' }, { input: '407', expectedOutput: 'YES' }
  ]),
  P('Average of Array', 'Compute the average of N integers.\n\n**Input:** N then N integers.\n**Output:** Average rounded to 2 decimal places.', 'easy', 100, 'c', C_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'array', '4\n1 2 3 4', '2.50', [
    { input: '4\n1 2 3 4', expectedOutput: '2.50' }, { input: '2\n10 20', expectedOutput: '15.00' }, { input: '3\n1 1 1', expectedOutput: '1.00' }, { input: '5\n5 10 15 20 25', expectedOutput: '15.00' }, { input: '1\n42', expectedOutput: '42.00' }
  ]),
  P('Fibonacci (Iterative)', 'Print the first N Fibonacci numbers.\n\n**Input:** Integer N.\n**Output:** N Fibonacci numbers separated by spaces.', 'easy', 100, 'c', C_CODE, '1 ≤ N ≤ 50', 'O(n)', 'O(1)', 'dp', '7', '0 1 1 2 3 5 8', [
    { input: '7', expectedOutput: '0 1 1 2 3 5 8' }, { input: '1', expectedOutput: '0' }, { input: '2', expectedOutput: '0 1' }, { input: '10', expectedOutput: '0 1 1 2 3 5 8 13 21 34' }, { input: '5', expectedOutput: '0 1 1 2 3' }
  ]),
  P('Count Vowels', 'Count the number of vowels (a, e, i, o, u) in a string.\n\n**Input:** A string (no spaces).\n**Output:** Count of vowels.', 'easy', 100, 'c', C_CODE, '1 ≤ len ≤ 1000', 'O(n)', 'O(1)', 'string', 'hello', '2', [
    { input: 'hello', expectedOutput: '2' }, { input: 'aeiou', expectedOutput: '5' }, { input: 'bcdfg', expectedOutput: '0' }, { input: 'AEIOU', expectedOutput: '5' }, { input: 'programming', expectedOutput: '3' }
  ]),
  P('Binary to Decimal', 'Convert a binary string to decimal.\n\n**Input:** Binary string.\n**Output:** Decimal value.', 'easy', 100, 'c', C_CODE, '1 ≤ len ≤ 30', 'O(n)', 'O(1)', 'math', '1010', '10', [
    { input: '1010', expectedOutput: '10' }, { input: '1111', expectedOutput: '15' }, { input: '0', expectedOutput: '0' }, { input: '100000', expectedOutput: '32' }, { input: '1101', expectedOutput: '13' }
  ]),
  P('Reverse a String', 'Reverse the characters of a string.\n\n**Input:** String.\n**Output:** Reversed string.', 'easy', 100, 'c', C_CODE, '1 ≤ len ≤ 1000', 'O(n)', 'O(n)', 'string', 'hello', 'olleh', [
    { input: 'hello', expectedOutput: 'olleh' }, { input: 'a', expectedOutput: 'a' }, { input: 'racecar', expectedOutput: 'racecar' }, { input: 'abc', expectedOutput: 'cba' }, { input: '12345', expectedOutput: '54321' }
  ]),
  P('Check Anagram', 'Check if two strings are anagrams (same characters, different order).\n\n**Input:** Two strings.\n**Output:** "YES" or "NO".', 'easy', 100, 'c', C_CODE, '1 ≤ len ≤ 1000', 'O(n log n)', 'O(n)', 'string', 'listen\nsilent', 'YES', [
    { input: 'listen\nsilent', expectedOutput: 'YES' }, { input: 'hello\nworld', expectedOutput: 'NO' }, { input: 'abc\ncab', expectedOutput: 'YES' }, { input: 'aab\nabb', expectedOutput: 'NO' }, { input: 'rat\nart', expectedOutput: 'YES' }
  ]),
  P('Linear Search', 'Find the index of a target in an unsorted array.\n\n**Input:** N, target, then N integers.\n**Output:** 0-based index or -1.', 'easy', 100, 'c', C_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'searching', '5 3\n1 2 3 4 5', '2', [
    { input: '5 3\n1 2 3 4 5', expectedOutput: '2' }, { input: '3 9\n1 2 3', expectedOutput: '-1' }, { input: '1 1\n1', expectedOutput: '0' }, { input: '4 7\n3 7 1 9', expectedOutput: '1' }, { input: '2 5\n5 5', expectedOutput: '0' }
  ]),
  P('Swap Two Numbers', 'Swap two numbers without a temporary variable.\n\n**Input:** Two integers a b.\n**Output:** b a (swapped).', 'easy', 100, 'c', C_CODE, '−10^9 ≤ a,b ≤ 10^9', 'O(1)', 'O(1)', 'math', '3 5', '5 3', [
    { input: '3 5', expectedOutput: '5 3' }, { input: '0 0', expectedOutput: '0 0' }, { input: '-1 1', expectedOutput: '1 -1' }, { input: '100 200', expectedOutput: '200 100' }, { input: '7 7', expectedOutput: '7 7' }
  ]),
  P('Area of Circle', 'Compute the area of a circle given its radius.\n\n**Input:** Radius r.\n**Output:** Area (use π = 3.14159, round to 2 decimals).', 'easy', 100, 'c', C_CODE, '1 ≤ r ≤ 1000', 'O(1)', 'O(1)', 'math', '7', '153.94', [
    { input: '7', expectedOutput: '153.94' }, { input: '1', expectedOutput: '3.14' }, { input: '10', expectedOutput: '314.16' }, { input: '2', expectedOutput: '12.57' }, { input: '100', expectedOutput: '31415.90' }
  ]),
  P('Multiplication Table', 'Print the multiplication table of N.\n\n**Input:** Integer N.\n**Output:** N×1 to N×10, one per line.', 'easy', 100, 'c', C_CODE, '1 ≤ N ≤ 20', 'O(1)', 'O(1)', 'math', '3', '3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15\n3 x 6 = 18\n3 x 7 = 21\n3 x 8 = 24\n3 x 9 = 27\n3 x 10 = 30', [
    { input: '3', expectedOutput: '3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15\n3 x 6 = 18\n3 x 7 = 21\n3 x 8 = 24\n3 x 9 = 27\n3 x 10 = 30' }, { input: '1', expectedOutput: '1 x 1 = 1\n1 x 2 = 2\n1 x 3 = 3\n1 x 4 = 4\n1 x 5 = 5\n1 x 6 = 6\n1 x 7 = 7\n1 x 8 = 8\n1 x 9 = 9\n1 x 10 = 10' }, { input: '5', expectedOutput: '5 x 1 = 5\n5 x 2 = 10\n5 x 3 = 15\n5 x 4 = 20\n5 x 5 = 25\n5 x 6 = 30\n5 x 7 = 35\n5 x 8 = 40\n5 x 9 = 45\n5 x 10 = 50' }
  ]),
  P('Find Second Largest', 'Find the second largest element in an array.\n\n**Input:** N then N integers.\n**Output:** Second largest value.', 'easy', 100, 'c', C_CODE, '2 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'array', '5\n1 5 3 4 2', '4', [
    { input: '5\n1 5 3 4 2', expectedOutput: '4' }, { input: '3\n10 10 5', expectedOutput: '5' }, { input: '2\n1 2', expectedOutput: '1' }, { input: '4\n-1 -5 -3 -2', expectedOutput: '-1' }, { input: '6\n7 7 7 7 7 7', expectedOutput: '7' }
  ]),

  // ========== C MEDIUM PROBLEMS (15) ==========
  P('Bubble Sort', 'Sort an array using bubble sort.\n\n**Input:** N then N integers.\n**Output:** Sorted array in ascending order.', 'medium', 150, 'c', C_CODE, '1 ≤ N ≤ 1000', 'O(n²)', 'O(1)', 'sorting', '5\n5 4 3 2 1', '1 2 3 4 5', [
    { input: '5\n5 4 3 2 1', expectedOutput: '1 2 3 4 5' }, { input: '3\n3 1 2', expectedOutput: '1 2 3' }, { input: '1\n1', expectedOutput: '1' }, { input: '4\n4 3 2 1', expectedOutput: '1 2 3 4' }, { input: '6\n1 3 2 5 4 6', expectedOutput: '1 2 3 4 5 6' }
  ]),
  P('Selection Sort', 'Sort an array using selection sort.\n\n**Input:** N then N integers.\n**Output:** Sorted array in ascending order.', 'medium', 150, 'c', C_CODE, '1 ≤ N ≤ 1000', 'O(n²)', 'O(1)', 'sorting', '5\n5 4 3 2 1', '1 2 3 4 5', [
    { input: '5\n5 4 3 2 1', expectedOutput: '1 2 3 4 5' }, { input: '3\n3 1 2', expectedOutput: '1 2 3' }, { input: '4\n4 3 2 1', expectedOutput: '1 2 3 4' }, { input: '2\n2 1', expectedOutput: '1 2' }, { input: '6\n9 8 7 6 5 4', expectedOutput: '4 5 6 7 8 9' }
  ]),
  P('Insertion Sort', 'Sort an array using insertion sort.\n\n**Input:** N then N integers.\n**Output:** Sorted array in ascending order.', 'medium', 150, 'c', C_CODE, '1 ≤ N ≤ 1000', 'O(n²)', 'O(1)', 'sorting', '5\n5 4 3 2 1', '1 2 3 4 5', [
    { input: '5\n5 4 3 2 1', expectedOutput: '1 2 3 4 5' }, { input: '3\n3 1 2', expectedOutput: '1 2 3' }, { input: '4\n4 3 2 1', expectedOutput: '1 2 3 4' }, { input: '2\n2 1', expectedOutput: '1 2' }, { input: '6\n9 8 7 6 5 4', expectedOutput: '4 5 6 7 8 9' }
  ]),
  P('Matrix Addition', 'Add two N×N matrices.\n\n**Input:** N, then N lines of matrix A, then N lines of matrix B.\n**Output:** N lines of A+B.', 'medium', 150, 'c', C_CODE, '1 ≤ N ≤ 50', 'O(n²)', 'O(n²)', 'matrix', '2\n1 2\n3 4\n5 6\n7 8', '6 8\n10 12', [
    { input: '2\n1 2\n3 4\n5 6\n7 8', expectedOutput: '6 8\n10 12' }, { input: '1\n5\n3', expectedOutput: '8' }, { input: '2\n1 0\n0 1\n1 1\n1 1', expectedOutput: '2 1\n1 2' }
  ]),
  P('Matrix Multiplication', 'Multiply two N×N matrices.\n\n**Input:** N, matrix A, matrix B.\n**Output:** Matrix C = A×B.', 'hard', 250, 'c', C_CODE, '1 ≤ N ≤ 10', 'O(n³)', 'O(n²)', 'matrix', '2\n1 2\n3 4\n5 6\n7 8', '19 22\n43 50', [
    { input: '2\n1 2\n3 4\n5 6\n7 8', expectedOutput: '19 22\n43 50' }, { input: '1\n3\n4', expectedOutput: '12' }, { input: '2\n1 0\n0 1\n5 6\n7 8', expectedOutput: '5 6\n7 8' }
  ]),
  P('Binary Search', 'Perform binary search on a sorted array.\n\n**Input:** N, target, then N sorted integers.\n**Output:** 0-based index or -1.', 'medium', 150, 'c', C_CODE, '1 ≤ N ≤ 10^5', 'O(log n)', 'O(1)', 'searching', '5 3\n1 2 3 4 5', '2', [
    { input: '5 3\n1 2 3 4 5', expectedOutput: '2' }, { input: '5 6\n1 2 3 4 5', expectedOutput: '-1' }, { input: '1 1\n1', expectedOutput: '0' }, { input: '4 4\n1 3 4 7', expectedOutput: '2' }, { input: '6 9\n1 2 3 4 5 9', expectedOutput: '5' }
  ]),
  P('Two Sum', 'Find two numbers in an array that add up to a target.\n\n**Input:** N, target, then N integers.\n**Output:** Two indices (0-based) separated by space, or "-1 -1".', 'medium', 150, 'c', C_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(n)', 'hashing', '5 9\n2 7 11 15 3', '0 1', [
    { input: '5 9\n2 7 11 15 3', expectedOutput: '0 1' }, { input: '4 6\n3 2 4 1', expectedOutput: '1 2' }, { input: '3 10\n1 2 3', expectedOutput: '-1 -1' }, { input: '2 5\n5 0', expectedOutput: '0 1' }, { input: '5 8\n1 3 5 7 2', expectedOutput: '2 4' }
  ]),
  P('Maximum Subarray (Kadane)', 'Find the maximum sum of a contiguous subarray.\n\n**Input:** N then N integers (can be negative).\n**Output:** Maximum subarray sum.', 'medium', 150, 'c', C_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'dp', '8\n-2 1 -3 4 -1 2 1 -5 4', '6', [
    { input: '8\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6' }, { input: '1\n-1', expectedOutput: '-1' }, { input: '5\n1 2 3 4 5', expectedOutput: '15' }, { input: '5\n-1 -2 -3 -4 -5', expectedOutput: '-1' }, { input: '4\n5 -2 3 -1', expectedOutput: '6' }
  ]),
  P('Merge Two Sorted Arrays', 'Merge two sorted arrays into one sorted array.\n\n**Input:** N, M, array A, array B.\n**Output:** Merged sorted array.', 'medium', 150, 'c', C_CODE, '1 ≤ N,M ≤ 10^5', 'O(n+m)', 'O(n+m)', 'two-pointers', '3 3\n1 3 5\n2 4 6', '1 2 3 4 5 6', [
    { input: '3 3\n1 3 5\n2 4 6', expectedOutput: '1 2 3 4 5 6' }, { input: '2 3\n1 2\n3 4 5', expectedOutput: '1 2 3 4 5' }, { input: '1 1\n1\n2', expectedOutput: '1 2' }, { input: '3 0\n1 2 3', expectedOutput: '1 2 3' }
  ]),
  P('Count Inversions', 'Count the number of inversions in an array (pairs where i<j and a[i]>a[j]).\n\n**Input:** N then N integers.\n**Output:** Number of inversions.', 'hard', 250, 'c', C_CODE, '1 ≤ N ≤ 10^5', 'O(n log n)', 'O(n)', 'divide-conquer', '5\n2 4 1 3 5', '3', [
    { input: '5\n2 4 1 3 5', expectedOutput: '3' }, { input: '3\n3 2 1', expectedOutput: '3' }, { input: '4\n1 2 3 4', expectedOutput: '0' }, { input: '4\n4 3 2 1', expectedOutput: '6' }, { input: '2\n2 1', expectedOutput: '1' }
  ]),
  P('Longest Common Prefix', 'Find the longest common prefix of N strings.\n\n**Input:** N then N strings.\n**Output:** The common prefix.', 'medium', 150, 'c', C_CODE, '1 ≤ N ≤ 100', 'O(n×m)', 'O(1)', 'string', '3\nflower\nflow\nflight', 'fl', [
    { input: '3\nflower\nflow\nflight', expectedOutput: 'fl' }, { input: '3\ndog\nracecar\ncar', expectedOutput: '' }, { input: '2\nsame\nsame', expectedOutput: 'same' }, { input: '3\nabc\nabd\nab', expectedOutput: 'ab' }
  ]),
  P('Remove Duplicates from Array', 'Remove duplicates from a sorted array.\n\n**Input:** N then N sorted integers.\n**Output:** Unique elements.', 'medium', 150, 'c', C_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'two-pointers', '6\n1 1 2 2 3 3', '1 2 3', [
    { input: '6\n1 1 2 2 3 3', expectedOutput: '1 2 3' }, { input: '4\n1 1 1 1', expectedOutput: '1' }, { input: '5\n1 2 3 4 5', expectedOutput: '1 2 3 4 5' }, { input: '3\n1 1 2', expectedOutput: '1 2' }
  ]),
  P('Rotate Array', 'Rotate an array to the right by K positions.\n\n**Input:** N, K, then N integers.\n**Output:** Rotated array.', 'medium', 150, 'c', C_CODE, '1 ≤ N ≤ 10^5, 0 ≤ K ≤ N', 'O(n)', 'O(1)', 'array', '5 2\n1 2 3 4 5', '4 5 1 2 3', [
    { input: '5 2\n1 2 3 4 5', expectedOutput: '4 5 1 2 3' }, { input: '5 3\n1 2 3 4 5', expectedOutput: '3 4 5 1 2' }, { input: '3 0\n1 2 3', expectedOutput: '1 2 3' }, { input: '4 4\n1 2 3 4', expectedOutput: '1 2 3 4' }
  ]),
  P('Find Majority Element', 'Find the element that appears more than N/2 times.\n\n**Input:** N then N integers.\n**Output:** Majority element or -1.', 'medium', 150, 'c', C_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'hashing', '5\n3 3 4 2 3', '3', [
    { input: '5\n3 3 4 2 3', expectedOutput: '3' }, { input: '3\n1 1 1', expectedOutput: '1' }, { input: '4\n1 2 3 4', expectedOutput: '-1' }, { input: '7\n2 2 2 2 5 5 5', expectedOutput: '2' }, { input: '1\n9', expectedOutput: '9' }
  ]),
  P('Pair Sum Closest to Zero', 'Find two numbers whose sum is closest to zero.\n\n**Input:** N then N integers.\n**Output:** The two numbers (smaller first).', 'medium', 150, 'c', C_CODE, '1 ≤ N ≤ 10^5', 'O(n log n)', 'O(1)', 'two-pointers', '5\n1 60 -10 70 -80', '-80 70', [
    { input: '5\n1 60 -10 70 -80', expectedOutput: '-80 70' }, { input: '4\n-10 -20 30 40', expectedOutput: '-20 30' }, { input: '3\n1 2 -1', expectedOutput: '-1 1' }, { input: '5\n-5 5 10 -10 20', expectedOutput: '-10 10' }, { input: '2\n-5 5', expectedOutput: '-5 5' }
  ]),

  // ========== C HARD PROBLEMS (5) ==========
  P('N-Queens', 'Count the number of ways to place N queens on an N×N chessboard.\n\n**Input:** Integer N.\n**Output:** Number of solutions.', 'hard', 250, 'c', C_CODE, '1 ≤ N ≤ 10', 'O(n!)', 'O(n)', 'backtracking', '4', '2', [
    { input: '4', expectedOutput: '2' }, { input: '1', expectedOutput: '1' }, { input: '2', expectedOutput: '0' }, { input: '3', expectedOutput: '0' }, { input: '8', expectedOutput: '92' }
  ]),
  P('Longest Increasing Subsequence', 'Find the length of the longest increasing subsequence.\n\n**Input:** N then N integers.\n**Output:** Length of LIS.', 'hard', 250, 'c', C_CODE, '1 ≤ N ≤ 1000', 'O(n²)', 'O(n)', 'dp', '6\n10 22 9 33 21 50', '4', [
    { input: '6\n10 22 9 33 21 50', expectedOutput: '4' }, { input: '5\n3 10 2 1 20', expectedOutput: '3' }, { input: '3\n3 2 1', expectedOutput: '1' }, { input: '4\n1 2 3 4', expectedOutput: '4' }, { input: '5\n5 4 3 2 1', expectedOutput: '1' }
  ]),
  P('Edit Distance', 'Find the minimum number of operations to convert string A to B.\n\n**Input:** Two strings.\n**Output:** Minimum edit distance.', 'hard', 250, 'c', C_CODE, '1 ≤ len ≤ 100', 'O(n×m)', 'O(n×m)', 'dp', 'kitten\nsitting', '3', [
    { input: 'kitten\nsitting', expectedOutput: '3' }, { input: 'abc\nabc', expectedOutput: '0' }, { input: 'abc\n', expectedOutput: '3' }, { input: 'good\nbad', expectedOutput: '3' }, { input: 'a\nb', expectedOutput: '1' }
  ]),
  P('Knapsack Problem', 'Find the maximum value that fits in a knapsack of capacity W.\n\n**Input:** N, W, weights, values.\n**Output:** Maximum value.', 'hard', 250, 'c', C_CODE, '1 ≤ N ≤ 100, 1 ≤ W ≤ 1000', 'O(n×w)', 'O(n×w)', 'dp', '3 50\n10 20 30\n60 100 120', '220', [
    { input: '3 50\n10 20 30\n60 100 120', expectedOutput: '220' }, { input: '3 10\n3 4 5\n30 50 60', expectedOutput: '110' }, { input: '2 5\n2 3\n3 4', expectedOutput: '7' }, { input: '1 10\n5\n20', expectedOutput: '20' }
  ]),
  P('Tower of Hanoi', 'Print the moves to solve the Tower of Hanoi with N disks.\n\n**Input:** Integer N.\n**Output:** Each move as "Move disk X from A to C".', 'hard', 250, 'c', C_CODE, '1 ≤ N ≤ 10', 'O(2^n)', 'O(n)', 'recursion', '3', 'Move disk 1 from A to C\nMove disk 2 from A to B\nMove disk 1 from C to B\nMove disk 3 from A to C\nMove disk 1 from B to A\nMove disk 2 from B to C\nMove disk 1 from A to C', [
    { input: '3', expectedOutput: 'Move disk 1 from A to C\nMove disk 2 from A to B\nMove disk 1 from C to B\nMove disk 3 from A to C\nMove disk 1 from B to A\nMove disk 2 from B to C\nMove disk 1 from A to C' }, { input: '1', expectedOutput: 'Move disk 1 from A to C' }, { input: '2', expectedOutput: 'Move disk 1 from A to B\nMove disk 2 from A to C\nMove disk 1 from B to C' }
  ]),
  P('Quick Sort', 'Sort an array using the quick sort algorithm.\n\n**Input:** N then N integers.\n**Output:** Sorted array.', 'medium', 150, 'c', C_CODE, '1 ≤ N ≤ 10^5', 'O(n log n)', 'O(log n)', 'sorting', '5\n5 4 3 2 1', '1 2 3 4 5', [
    { input: '5\n5 4 3 2 1', expectedOutput: '1 2 3 4 5' }, { input: '3\n3 1 2', expectedOutput: '1 2 3' }, { input: '4\n4 3 2 1', expectedOutput: '1 2 3 4' }, { input: '6\n9 8 7 6 5 4', expectedOutput: '4 5 6 7 8 9' }, { input: '2\n2 1', expectedOutput: '1 2' }
  ]),
  P('Merge Sort', 'Sort an array using the merge sort algorithm.\n\n**Input:** N then N integers.\n**Output:** Sorted array.', 'medium', 150, 'c', C_CODE, '1 ≤ N ≤ 10^5', 'O(n log n)', 'O(n)', 'sorting', '5\n5 4 3 2 1', '1 2 3 4 5', [
    { input: '5\n5 4 3 2 1', expectedOutput: '1 2 3 4 5' }, { input: '3\n3 1 2', expectedOutput: '1 2 3' }, { input: '4\n4 3 2 1', expectedOutput: '1 2 3 4' }, { input: '6\n9 8 7 6 5 4', expectedOutput: '4 5 6 7 8 9' }, { input: '2\n2 1', expectedOutput: '1 2' }
  ]),

  // ========== PYTHON EASY PROBLEMS (15) ==========
  P('Palindrome Check', 'Check if a string is a palindrome (ignoring case).\n\n**Input:** A string.\n**Output:** "YES" or "NO".', 'easy', 100, 'python', PY_CODE, '1 ≤ len ≤ 1000', 'O(n)', 'O(1)', 'string', 'racecar', 'YES', [
    { input: 'racecar', expectedOutput: 'YES' }, { input: 'hello', expectedOutput: 'NO' }, { input: 'Madam', expectedOutput: 'YES' }, { input: 'a', expectedOutput: 'YES' }, { input: 'ab', expectedOutput: 'NO' }
  ]),
  P('Count Words', 'Count the number of words in a sentence.\n\n**Input:** A sentence.\n**Output:** Number of words.', 'easy', 100, 'python', PY_CODE, '1 ≤ len ≤ 1000', 'O(n)', 'O(1)', 'string', 'Hello world from Python', '4', [
    { input: 'Hello world from Python', expectedOutput: '4' }, { input: 'one', expectedOutput: '1' }, { input: 'a b c d e', expectedOutput: '5' }, { input: 'This is a test', expectedOutput: '4' }, { input: 'Python', expectedOutput: '1' }
  ]),
  P('List Sum', 'Sum all elements in a list.\n\n**Input:** N then N integers.\n**Output:** Sum.', 'easy', 100, 'python', PY_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'array', '5\n1 2 3 4 5', '15', [
    { input: '5\n1 2 3 4 5', expectedOutput: '15' }, { input: '3\n-1 -2 -3', expectedOutput: '-6' }, { input: '1\n0', expectedOutput: '0' }, { input: '4\n10 20 30 40', expectedOutput: '100' }, { input: '2\n5 5', expectedOutput: '10' }
  ]),
  P('Find Min and Max', 'Find the minimum and maximum of a list.\n\n**Input:** N then N integers.\n**Output:** "min max".', 'easy', 100, 'python', PY_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'array', '5\n3 7 2 9 1', '1 9', [
    { input: '5\n3 7 2 9 1', expectedOutput: '1 9' }, { input: '3\n-5 -1 -3', expectedOutput: '-5 -1' }, { input: '1\n42', expectedOutput: '42 42' }, { input: '4\n10 20 30 40', expectedOutput: '10 40' }, { input: '2\n100 50', expectedOutput: '50 100' }
  ]),
  P('String to Integer', 'Convert a numeric string to an integer without using int().\n\n**Input:** A numeric string.\n**Output:** The integer value.', 'easy', 100, 'python', PY_CODE, '1 ≤ len ≤ 10', 'O(n)', 'O(1)', 'string', '123', '123', [
    { input: '123', expectedOutput: '123' }, { input: '-45', expectedOutput: '-45' }, { input: '0', expectedOutput: '0' }, { input: '999', expectedOutput: '999' }, { input: '7', expectedOutput: '7' }
  ]),
  P('Leap Year', 'Check if a year is a leap year.\n\n**Input:** Year Y.\n**Output:** "YES" or "NO".', 'easy', 100, 'python', PY_CODE, '1 ≤ Y ≤ 10^9', 'O(1)', 'O(1)', 'math', '2024', 'YES', [
    { input: '2024', expectedOutput: 'YES' }, { input: '1900', expectedOutput: 'NO' }, { input: '2000', expectedOutput: 'YES' }, { input: '2023', expectedOutput: 'NO' }, { input: '2400', expectedOutput: 'YES' }
  ]),
  P('Reverse Words', 'Reverse the order of words in a sentence.\n\n**Input:** A sentence.\n**Output:** Words in reverse order.', 'easy', 100, 'python', PY_CODE, '1 ≤ len ≤ 1000', 'O(n)', 'O(n)', 'string', 'Hello World Python', 'Python World Hello', [
    { input: 'Hello World Python', expectedOutput: 'Python World Hello' }, { input: 'one', expectedOutput: 'one' }, { input: 'a b c', expectedOutput: 'c b a' }, { input: 'This is a test', expectedOutput: 'test a is This' }, { input: 'coding is fun', expectedOutput: 'fun is coding' }
  ]),
  P('Power of Two', 'Check if a number is a power of two.\n\n**Input:** Integer N.\n**Output:** "YES" or "NO".', 'easy', 100, 'python', PY_CODE, '1 ≤ N ≤ 10^18', 'O(1)', 'O(1)', 'bit-manipulation', '16', 'YES', [
    { input: '16', expectedOutput: 'YES' }, { input: '1', expectedOutput: 'YES' }, { input: '3', expectedOutput: 'NO' }, { input: '64', expectedOutput: 'YES' }, { input: '100', expectedOutput: 'NO' }
  ]),
  P('Count Characters', 'Count the frequency of each character in a string.\n\n**Input:** A string.\n**Output:** Each unique character and its count, one per line.', 'easy', 100, 'python', PY_CODE, '1 ≤ len ≤ 1000', 'O(n)', 'O(n)', 'string', 'hello', 'h: 1\ne: 1\nl: 2\no: 1', [
    { input: 'hello', expectedOutput: 'h: 1\ne: 1\nl: 2\no: 1' }, { input: 'a', expectedOutput: 'a: 1' }, { input: 'aabb', expectedOutput: 'a: 2\nb: 2' }, { input: 'abc', expectedOutput: 'a: 1\nb: 1\nc: 1' }
  ]),
  P('Sum of Squares', 'Sum of squares of first N natural numbers.\n\n**Input:** N.\n**Output:** Sum of squares.', 'easy', 100, 'python', PY_CODE, '1 ≤ N ≤ 10^6', 'O(1)', 'O(1)', 'math', '5', '55', [
    { input: '5', expectedOutput: '55' }, { input: '1', expectedOutput: '1' }, { input: '3', expectedOutput: '14' }, { input: '10', expectedOutput: '385' }, { input: '2', expectedOutput: '5' }
  ]),
  P('Remove Vowels', 'Remove all vowels from a string.\n\n**Input:** A string.\n**Output:** String without vowels.', 'easy', 100, 'python', PY_CODE, '1 ≤ len ≤ 1000', 'O(n)', 'O(n)', 'string', 'hello world', 'hll wrld', [
    { input: 'hello world', expectedOutput: 'hll wrld' }, { input: 'aeiou', expectedOutput: '' }, { input: 'Python', expectedOutput: 'Pythn' }, { input: 'APPLE', expectedOutput: 'PPL' }, { input: 'xyz', expectedOutput: 'xyz' }
  ]),
  P('Square Root', 'Compute the integer square root of N.\n\n**Input:** Integer N.\n**Output:** Floor of sqrt(N).', 'easy', 100, 'python', PY_CODE, '0 ≤ N ≤ 10^12', 'O(log n)', 'O(1)', 'math', '16', '4', [
    { input: '16', expectedOutput: '4' }, { input: '17', expectedOutput: '4' }, { input: '0', expectedOutput: '0' }, { input: '1', expectedOutput: '1' }, { input: '99', expectedOutput: '9' }
  ]),
  P('Check Sorted', 'Check if a list is sorted in ascending order.\n\n**Input:** N then N integers.\n**Output:** "YES" or "NO".', 'easy', 100, 'python', PY_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'array', '5\n1 2 3 4 5', 'YES', [
    { input: '5\n1 2 3 4 5', expectedOutput: 'YES' }, { input: '5\n1 3 2 4 5', expectedOutput: 'NO' }, { input: '3\n3 3 3', expectedOutput: 'YES' }, { input: '2\n2 1', expectedOutput: 'NO' }, { input: '1\n5', expectedOutput: 'YES' }
  ]),
  P('Find Missing Number', 'Find the missing number from 1 to N in a list of N-1 numbers.\n\n**Input:** N-1 integers.\n**Output:** The missing number.', 'easy', 100, 'python', PY_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'math', '5\n1 2 4 5', '3', [
    { input: '5\n1 2 4 5', expectedOutput: '3' }, { input: '3\n1 3', expectedOutput: '2' }, { input: '4\n1 2 3', expectedOutput: '4' }, { input: '2\n2', expectedOutput: '1' }, { input: '6\n1 2 3 4 5', expectedOutput: '6' }
  ]),
  P('LCM of Two Numbers', 'Find the LCM of two numbers.\n\n**Input:** Two integers a b.\n**Output:** Their LCM.', 'easy', 100, 'python', PY_CODE, '1 ≤ a,b ≤ 10^9', 'O(log min(a,b))', 'O(1)', 'math', '4 6', '12', [
    { input: '4 6', expectedOutput: '12' }, { input: '5 7', expectedOutput: '35' }, { input: '12 18', expectedOutput: '36' }, { input: '1 10', expectedOutput: '10' }, { input: '8 12', expectedOutput: '24' }
  ]),

  // ========== PYTHON MEDIUM PROBLEMS (10) ==========
  P('Anagram Groups', 'Group strings that are anagrams of each other.\n\n**Input:** N then N strings.\n**Output:** Number of anagram groups.', 'medium', 150, 'python', PY_CODE, '1 ≤ N ≤ 1000', 'O(n×m)', 'O(n)', 'hashing', '5\nate\neat\ntea\nbat\ntab', '2', [
    { input: '5\nate\neat\ntea\nbat\ntab', expectedOutput: '2' }, { input: '3\nabc\ncab\nbac', expectedOutput: '1' }, { input: '4\nabc\ndef\nghi\njkl', expectedOutput: '4' }, { input: '2\naa\naa', expectedOutput: '1' }
  ]),
  P('Longest Substring Without Repeat', 'Find the length of the longest substring without repeating characters.\n\n**Input:** A string.\n**Output:** Length.', 'medium', 150, 'python', PY_CODE, '1 ≤ len ≤ 10^5', 'O(n)', 'O(n)', 'sliding-window', 'abcabcbb', '3', [
    { input: 'abcabcbb', expectedOutput: '3' }, { input: 'bbbbb', expectedOutput: '1' }, { input: 'pwwkew', expectedOutput: '3' }, { input: 'abcdef', expectedOutput: '6' }, { input: 'abba', expectedOutput: '2' }
  ]),
  P('Container With Most Water', 'Find the maximum water a container can hold.\n\n**Input:** N then N heights.\n**Output:** Max water area.', 'medium', 150, 'python', PY_CODE, '2 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'two-pointers', '6\n1 8 6 2 5 4 8 3 7', '49', [
    { input: '6\n1 8 6 2 5 4 8 3 7', expectedOutput: '49' }, { input: '4\n1 1', expectedOutput: '1' }, { input: '5\n4 3 2 1 4', expectedOutput: '16' }, { input: '3\n1 2 1', expectedOutput: '2' }
  ]),
  P('Product of Array Except Self', 'Return an array where each element is the product of all other elements.\n\n**Input:** N then N integers.\n**Output:** Product array.', 'medium', 150, 'python', PY_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(n)', 'array', '4\n1 2 3 4', '24 12 8 6', [
    { input: '4\n1 2 3 4', expectedOutput: '24 12 8 6' }, { input: '3\n1 2 3', expectedOutput: '6 3 2' }, { input: '2\n5 5', expectedOutput: '5 5' }, { input: '4\n-1 1 0 -3', expectedOutput: '0 0 6 0' }
  ]),
  P('Valid Parentheses', 'Check if a string of parentheses is valid.\n\n**Input:** String with (), [], {}.\n**Output:** "YES" or "NO".', 'medium', 150, 'python', PY_CODE, '1 ≤ len ≤ 10^5', 'O(n)', 'O(n)', 'stack', '()[]{}', 'YES', [
    { input: '()[]{}', expectedOutput: 'YES' }, { input: '(]', expectedOutput: 'NO' }, { input: '([)]', expectedOutput: 'NO' }, { input: '{[]}', expectedOutput: 'YES' }, { input: '(', expectedOutput: 'NO' }
  ]),
  P('Find Peak Element', 'Find a peak element (greater than its neighbors).\n\n**Input:** N then N integers.\n**Output:** Index of a peak element.', 'medium', 150, 'python', PY_CODE, '1 ≤ N ≤ 10^5', 'O(log n)', 'O(1)', 'binary-search', '5\n1 2 3 1', '2', [
    { input: '5\n1 2 3 1', expectedOutput: '2' }, { input: '3\n1 2 1', expectedOutput: '1' }, { input: '2\n1 2', expectedOutput: '1' }, { input: '4\n3 2 1 4', expectedOutput: '0 3' }
  ]),
  P('Min Stack', 'Design a stack that supports push, pop, top, and getMin in O(1).\n\n**Input:** Operations.\n**Output:** Results of getMin operations.', 'medium', 150, 'python', PY_CODE, '1 ≤ N ≤ 10^5', 'O(1)', 'O(n)', 'stack', '5\npush 5\npush 3\npush 7\ngetMin\npop', '3', [
    { input: '5\npush 5\npush 3\npush 7\ngetMin\npop', expectedOutput: '3' }, { input: '4\npush 2\npush 1\ngetMin\ngetMin', expectedOutput: '1 1' }, { input: '3\npush 10\ngetMin\ngetMin', expectedOutput: '10 10' }
  ]),
  P('Subarray Sum Equals K', 'Count the number of subarrays whose sum equals K.\n\n**Input:** N, K, then N integers.\n**Output:** Count.', 'medium', 150, 'python', PY_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(n)', 'hashing', '5 7\n1 2 3 4 5', '2', [
    { input: '5 7\n1 2 3 4 5', expectedOutput: '2' }, { input: '3 6\n1 2 3', expectedOutput: '2' }, { input: '2 0\n1 -1', expectedOutput: '1' }, { input: '4 5\n5 0 0 5', expectedOutput: '4' }
  ]),
  P('Group by Parity', 'Partition an array so all even numbers come first.\n\n**Input:** N then N integers.\n**Output:** Array with evens first.', 'medium', 150, 'python', PY_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'two-pointers', '5\n3 1 2 4 5', '2 4 3 1 5', [
    { input: '5\n3 1 2 4 5', expectedOutput: '2 4 3 1 5' }, { input: '4\n1 2 3 4', expectedOutput: '2 4 1 3' }, { input: '3\n2 4 6', expectedOutput: '2 4 6' }
  ]),
  P('Decode String', 'Decode a string like "3[a]2[bc]" to "aaabcbc".\n\n**Input:** Encoded string.\n**Output:** Decoded string.', 'medium', 150, 'python', PY_CODE, '1 ≤ len ≤ 100', 'O(n)', 'O(n)', 'stack', '3[a]2[bc]', 'aaabcbc', [
    { input: '3[a]2[bc]', expectedOutput: 'aaabcbc' }, { input: '2[ab]', expectedOutput: 'abab' }, { input: '3[a2[c]]', expectedOutput: 'accaccacc' }, { input: 'a', expectedOutput: 'a' }
  ]),

  // ========== PYTHON HARD PROBLEMS (5) ==========
  P('Longest Common Subsequence', 'Find the length of the LCS of two strings.\n\n**Input:** Two strings.\n**Output:** Length of LCS.', 'hard', 250, 'python', PY_CODE, '1 ≤ len ≤ 1000', 'O(n×m)', 'O(n×m)', 'dp', 'ABCBDAB\nBDCABA', '4', [
    { input: 'ABCBDAB\nBDCABA', expectedOutput: '4' }, { input: 'ABC\nABC', expectedOutput: '3' }, { input: 'ABC\nDEF', expectedOutput: '0' }, { input: 'AGGTAB\nGXTXAYB', expectedOutput: '4' }
  ]),
  P('Word Break', 'Check if a string can be segmented into dictionary words.\n\n**Input:** String, then N dictionary words.\n**Output:** "YES" or "NO".', 'hard', 250, 'python', PY_CODE, '1 ≤ len ≤ 1000', 'O(n²)', 'O(n)', 'dp', 'leetcode\n5\nleet\ncode\nle\net\nlee', 'YES', [
    { input: 'leetcode\n5\nleet\ncode\nle\net\nlee', expectedOutput: 'YES' }, { input: 'applepenapple\n2\napple\npen', expectedOutput: 'YES' }, { input: 'catsandog\n3\ncats\ndog\nsand', expectedOutput: 'NO' }
  ]),
  P('Coin Change', 'Find the minimum number of coins to make an amount.\n\n**Input:** N, amount, then N coin values.\n**Output:** Minimum coins or -1.', 'hard', 250, 'python', PY_CODE, '1 ≤ N ≤ 100, 0 ≤ amount ≤ 10^4', 'O(n×amount)', 'O(amount)', 'dp', '3 11\n1 2 5', '3', [
    { input: '3 11\n1 2 5', expectedOutput: '3' }, { input: '1 3\n2', expectedOutput: '-1' }, { input: '3 0\n1 2 5', expectedOutput: '0' }, { input: '4 7\n1 3 4 5', expectedOutput: '2' }
  ]),
  P('Maximal Rectangle', 'Find the largest rectangle in a binary matrix.\n\n**Input:** N, M, then matrix.\n**Output:** Max rectangle area.', 'hard', 250, 'python', PY_CODE, '1 ≤ N,M ≤ 100', 'O(n×m)', 'O(m)', 'stack', '4 5\n1 0 1 0 0\n1 0 1 1 1\n1 1 1 1 1\n1 0 0 1 0', '6', [
    { input: '4 5\n1 0 1 0 0\n1 0 1 1 1\n1 1 1 1 1\n1 0 0 1 0', expectedOutput: '6' }, { input: '1 1\n0', expectedOutput: '0' }, { input: '2 2\n1 1\n1 1', expectedOutput: '4' }
  ]),
  P('Wildcard Matching', 'Check if a string matches a pattern with * and ?.\n\n**Input:** String, pattern.\n**Output:** "YES" or "NO".', 'hard', 250, 'python', PY_CODE, '1 ≤ len ≤ 1000', 'O(n×m)', 'O(n×m)', 'dp', 'adceb\n*a*b', 'YES', [
    { input: 'adceb\n*a*b', expectedOutput: 'YES' }, { input: 'aa\na', expectedOutput: 'NO' }, { input: 'aa\n*', expectedOutput: 'YES' }, { input: 'cb\n?b', expectedOutput: 'YES' }
  ]),

  // ========== JAVA EASY PROBLEMS (15) ==========
  P('Even or Odd', 'Check if a number is even or odd.\n\n**Input:** Integer N.\n**Output:** "Even" or "Odd".', 'easy', 100, 'java', JAVA_CODE, '−10^9 ≤ N ≤ 10^9', 'O(1)', 'O(1)', 'math', '4', 'Even', [
    { input: '4', expectedOutput: 'Even' }, { input: '7', expectedOutput: 'Odd' }, { input: '0', expectedOutput: 'Even' }, { input: '-3', expectedOutput: 'Odd' }, { input: '100', expectedOutput: 'Even' }
  ]),
  P('Sum of Array', 'Sum all elements of an array.\n\n**Input:** N then N integers.\n**Output:** Sum.', 'easy', 100, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'array', '5\n1 2 3 4 5', '15', [
    { input: '5\n1 2 3 4 5', expectedOutput: '15' }, { input: '3\n1 1 1', expectedOutput: '3' }, { input: '4\n-1 -2 -3 -4', expectedOutput: '-10' }, { input: '2\n10 20', expectedOutput: '30' }
  ]),
  P('Reverse String Builder', 'Reverse a string using StringBuilder.\n\n**Input:** A string.\n**Output:** Reversed string.', 'easy', 100, 'java', JAVA_CODE, '1 ≤ len ≤ 1000', 'O(n)', 'O(n)', 'string', 'hello', 'olleh', [
    { input: 'hello', expectedOutput: 'olleh' }, { input: 'Java', expectedOutput: 'avaJ' }, { input: 'a', expectedOutput: 'a' }, { input: 'racecar', expectedOutput: 'racecar' }
  ]),
  P('Max of Three', 'Find the maximum of three numbers.\n\n**Input:** Three integers.\n**Output:** Maximum.', 'easy', 100, 'java', JAVA_CODE, '−10^9 ≤ a,b,c ≤ 10^9', 'O(1)', 'O(1)', 'math', '3 7 5', '7', [
    { input: '3 7 5', expectedOutput: '7' }, { input: '10 10 10', expectedOutput: '10' }, { input: '-1 -5 -3', expectedOutput: '-1' }, { input: '100 50 75', expectedOutput: '100' }, { input: '1 2 3', expectedOutput: '3' }
  ]),
  P('Count Digits', 'Count the number of digits in an integer.\n\n**Input:** Integer N.\n**Output:** Number of digits.', 'easy', 100, 'java', JAVA_CODE, '0 ≤ N ≤ 10^18', 'O(log n)', 'O(1)', 'math', '12345', '5', [
    { input: '12345', expectedOutput: '5' }, { input: '0', expectedOutput: '1' }, { input: '100', expectedOutput: '3' }, { input: '999999', expectedOutput: '6' }, { input: '7', expectedOutput: '1' }
  ]),
  P('Check Palindrome Number', 'Check if an integer is a palindrome.\n\n**Input:** Integer N.\n**Output:** "YES" or "NO".', 'easy', 100, 'java', JAVA_CODE, '0 ≤ N ≤ 10^9', 'O(log n)', 'O(1)', 'math', '121', 'YES', [
    { input: '121', expectedOutput: 'YES' }, { input: '123', expectedOutput: 'NO' }, { input: '0', expectedOutput: 'YES' }, { input: '1221', expectedOutput: 'YES' }, { input: '10', expectedOutput: 'NO' }
  ]),
  P('Array Contains Duplicate', 'Check if an array contains duplicates.\n\n**Input:** N then N integers.\n**Output:** "YES" or "NO".', 'easy', 100, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(n)', 'hashing', '4\n1 2 3 1', 'YES', [
    { input: '4\n1 2 3 1', expectedOutput: 'YES' }, { input: '4\n1 2 3 4', expectedOutput: 'NO' }, { input: '3\n1 1 1', expectedOutput: 'YES' }, { input: '2\n1 2', expectedOutput: 'NO' }
  ]),
  P('Find First and Last Position', 'Find the first and last occurrence of a target in a sorted array.\n\n**Input:** N, target, then N sorted integers.\n**Output:** "first last" or "-1 -1".', 'medium', 150, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(log n)', 'O(1)', 'binary-search', '6 5\n1 2 5 5 5 9', '2 4', [
    { input: '6 5\n1 2 5 5 5 9', expectedOutput: '2 4' }, { input: '4 3\n1 2 3 4', expectedOutput: '2 2' }, { input: '3 9\n1 2 3', expectedOutput: '-1 -1' }, { input: '5 1\n1 1 1 1 1', expectedOutput: '0 4' }
  ]),
  P('Intersection of Two Arrays', 'Find common elements of two arrays.\n\n**Input:** N, M, array A, array B.\n**Output:** Common elements (unique).', 'easy', 100, 'java', JAVA_CODE, '1 ≤ N,M ≤ 10^5', 'O(n+m)', 'O(n)', 'hashing', '4 5\n1 2 3 4\n2 3 4 5 6', '2 3 4', [
    { input: '4 5\n1 2 3 4\n2 3 4 5 6', expectedOutput: '2 3 4' }, { input: '3 3\n1 2 3\n4 5 6', expectedOutput: '' }, { input: '2 2\n1 1\n1 1', expectedOutput: '1' }, { input: '3 3\n1 2 3\n3 2 1', expectedOutput: '1 2 3' }
  ]),
  P('Move Zeroes', 'Move all zeros to the end of an array.\n\n**Input:** N then N integers.\n**Output:** Array with zeros at end.', 'easy', 100, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'two-pointers', '5\n0 1 0 3 12', '1 3 12 0 0', [
    { input: '5\n0 1 0 3 12', expectedOutput: '1 3 12 0 0' }, { input: '3\n0 0 1', expectedOutput: '1 0 0' }, { input: '4\n1 2 3 4', expectedOutput: '1 2 3 4' }, { input: '2\n0 0', expectedOutput: '0 0' }
  ]),
  P('Roman to Integer', 'Convert a Roman numeral to an integer.\n\n**Input:** Roman numeral string.\n**Output:** Integer value.', 'easy', 100, 'java', JAVA_CODE, '1 ≤ len ≤ 15', 'O(n)', 'O(1)', 'string', 'MCMXCIV', '1994', [
    { input: 'MCMXCIV', expectedOutput: '1994' }, { input: 'III', expectedOutput: '3' }, { input: 'LVIII', expectedOutput: '58' }, { input: 'IX', expectedOutput: '9' }, { input: 'X', expectedOutput: '10' }
  ]),
  P('Fibonacci with Recursion', 'Print the Nth Fibonacci number using recursion.\n\n**Input:** Integer N.\n**Output:** Nth Fibonacci number.', 'easy', 100, 'java', JAVA_CODE, '0 ≤ N ≤ 30', 'O(2^n)', 'O(n)', 'recursion', '10', '55', [
    { input: '10', expectedOutput: '55' }, { input: '0', expectedOutput: '0' }, { input: '1', expectedOutput: '1' }, { input: '20', expectedOutput: '6765' }, { input: '15', expectedOutput: '610' }
  ]),
  P('Count Primes', 'Count the number of primes less than N.\n\n**Input:** Integer N.\n**Output:** Count of primes < N.', 'easy', 100, 'java', JAVA_CODE, '2 ≤ N ≤ 10^6', 'O(n log log n)', 'O(n)', 'math', '10', '4', [
    { input: '10', expectedOutput: '4' }, { input: '2', expectedOutput: '0' }, { input: '20', expectedOutput: '8' }, { input: '100', expectedOutput: '25' }, { input: '1', expectedOutput: '0' }
  ]),
  P('Add Two Numbers (Linked List)', 'Add two numbers represented as linked lists.\n\n**Input:** Two numbers.\n**Output:** Sum.', 'easy', 100, 'java', JAVA_CODE, '1 ≤ N ≤ 10^9', 'O(n)', 'O(n)', 'linked-list', '342 465', '807', [
    { input: '342 465', expectedOutput: '807' }, { input: '0 0', expectedOutput: '0' }, { input: '5 5', expectedOutput: '10' }, { input: '999 1', expectedOutput: '1000' }
  ]),
  P('Valid Anagram (Java)', 'Check if two strings are anagrams.\n\n**Input:** Two strings.\n**Output:** "YES" or "NO".', 'easy', 100, 'java', JAVA_CODE, '1 ≤ len ≤ 1000', 'O(n)', 'O(n)', 'string', 'anagram\nnagaram', 'YES', [
    { input: 'anagram\nnagaram', expectedOutput: 'YES' }, { input: 'rat\ncar', expectedOutput: 'NO' }, { input: 'abc\ncab', expectedOutput: 'YES' }, { input: 'a\na', expectedOutput: 'YES' }
  ]),
  P('Binary Search (Java)', 'Binary search on a sorted array.\n\n**Input:** N, target, then N sorted integers.\n**Output:** Index or -1.', 'medium', 150, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(log n)', 'O(1)', 'searching', '5 3\n1 2 3 4 5', '2', [
    { input: '5 3\n1 2 3 4 5', expectedOutput: '2' }, { input: '5 6\n1 2 3 4 5', expectedOutput: '-1' }, { input: '1 1\n1', expectedOutput: '0' }, { input: '4 4\n1 3 4 7', expectedOutput: '2' }
  ]),

  // ========== JAVA MEDIUM PROBLEMS (10) ==========
  P('Sort Colors', 'Sort an array of 0s, 1s, and 2s in-place.\n\n**Input:** N then N integers (0, 1, or 2).\n**Output:** Sorted array.', 'medium', 150, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'sorting', '6\n2 0 2 1 1 0', '0 0 1 1 2 2', [
    { input: '6\n2 0 2 1 1 0', expectedOutput: '0 0 1 1 2 2' }, { input: '3\n2 0 1', expectedOutput: '0 1 2' }, { input: '4\n1 1 1 1', expectedOutput: '1 1 1 1' }, { input: '5\n2 2 0 0 1', expectedOutput: '0 0 1 2 2' }
  ]),
  P('Kth Largest Element', 'Find the Kth largest element in an array.\n\n**Input:** N, K, then N integers.\n**Output:** Kth largest element.', 'medium', 150, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(n log n)', 'O(1)', 'sorting', '6 2\n3 2 1 5 6 4', '5', [
    { input: '6 2\n3 2 1 5 6 4', expectedOutput: '5' }, { input: '3 1\n1 2 3', expectedOutput: '3' }, { input: '4 4\n1 2 3 4', expectedOutput: '1' }, { input: '5 3\n5 4 3 2 1', expectedOutput: '3' }
  ]),
  P('Find All Duplicates', 'Find all numbers that appear twice in an array.\n\n**Input:** N then N integers (1 to N).\n**Output:** Duplicate numbers.', 'medium', 150, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(n)', 'hashing', '8\n4 3 2 7 8 2 3 1', '2 3', [
    { input: '8\n4 3 2 7 8 2 3 1', expectedOutput: '2 3' }, { input: '5\n1 2 3 4 5', expectedOutput: '' }, { input: '4\n1 1 2 2', expectedOutput: '1 2' }, { input: '3\n3 3 3', expectedOutput: '3' }
  ]),
  P('Longest Palindromic Substring', 'Find the longest palindromic substring.\n\n**Input:** A string.\n**Output:** Longest palindrome substring.', 'medium', 150, 'java', JAVA_CODE, '1 ≤ len ≤ 1000', 'O(n²)', 'O(1)', 'dp', 'babad', 'bab', [
    { input: 'babad', expectedOutput: 'bab' }, { input: 'cbbd', expectedOutput: 'bb' }, { input: 'a', expectedOutput: 'a' }, { input: 'racecar', expectedOutput: 'racecar' }
  ]),
  P('Single Number', 'Find the element that appears only once (others appear twice).\n\n**Input:** N then N integers.\n**Output:** The single number.', 'medium', 150, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'bit-manipulation', '5\n4 1 2 1 2', '4', [
    { input: '5\n4 1 2 1 2', expectedOutput: '4' }, { input: '3\n2 2 1', expectedOutput: '1' }, { input: '1\n5', expectedOutput: '5' }, { input: '7\n1 2 3 1 2 3 9', expectedOutput: '9' }
  ]),
  P('Maximum Depth of Binary Tree', 'Find the maximum depth of a binary tree.\n\n**Input:** N then N values (0 for null).\n**Output:** Depth.', 'medium', 150, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(n)', 'tree', '7\n3 9 20 0 0 15 7', '3', [
    { input: '7\n3 9 20 0 0 15 7', expectedOutput: '3' }, { input: '1\n1', expectedOutput: '1' }, { input: '3\n1 2 3', expectedOutput: '2' }
  ]),
  P('Rotate Image', 'Rotate an N×N matrix 90 degrees clockwise.\n\n**Input:** N then N×N matrix.\n**Output:** Rotated matrix.', 'medium', 150, 'java', JAVA_CODE, '1 ≤ N ≤ 100', 'O(n²)', 'O(1)', 'matrix', '3\n1 2 3\n4 5 6\n7 8 9', '7 4 1\n8 5 2\n9 6 3', [
    { input: '3\n1 2 3\n4 5 6\n7 8 9', expectedOutput: '7 4 1\n8 5 2\n9 6 3' }, { input: '2\n1 2\n3 4', expectedOutput: '3 1\n4 2' }, { input: '1\n5', expectedOutput: '5' }
  ]),
  P('Number of Islands', 'Count the number of islands in a grid.\n\n**Input:** N, M, then grid of 0s and 1s.\n**Output:** Number of islands.', 'medium', 150, 'java', JAVA_CODE, '1 ≤ N,M ≤ 100', 'O(n×m)', 'O(n×m)', 'graph', '4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1', '3', [
    { input: '4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1', expectedOutput: '3' }, { input: '1 1\n1', expectedOutput: '1' }, { input: '3 3\n0 0 0\n0 0 0\n0 0 0', expectedOutput: '0' }
  ]),
  P('Merge Intervals', 'Merge overlapping intervals.\n\n**Input:** N then N pairs (start end).\n**Output:** Merged intervals.', 'medium', 150, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(n log n)', 'O(n)', 'sorting', '4\n1 3\n2 6\n8 10\n15 18', '1 6\n8 10\n15 18', [
    { input: '4\n1 3\n2 6\n8 10\n15 18', expectedOutput: '1 6\n8 10\n15 18' }, { input: '2\n1 4\n4 5', expectedOutput: '1 5' }, { input: '3\n1 4\n2 3\n5 6', expectedOutput: '1 4\n5 6' }
  ]),
  P('Top K Frequent Elements', 'Find the K most frequent elements.\n\n**Input:** N, K, then N integers.\n**Output:** K most frequent elements.', 'medium', 150, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(n log n)', 'O(n)', 'hashing', '7 2\n1 1 1 2 2 3 3', '1 2', [
    { input: '7 2\n1 1 1 2 2 3 3', expectedOutput: '1 2' }, { input: '5 1\n1 2 2 3 3', expectedOutput: '2' }, { input: '4 2\n1 1 1 2', expectedOutput: '1 2' }
  ]),

  // ========== JAVA HARD PROBLEMS (5) ==========
  P('Median of Two Sorted Arrays', 'Find the median of two sorted arrays.\n\n**Input:** N, M, array A, array B.\n**Output:** Median (1 decimal).', 'hard', 250, 'java', JAVA_CODE, '1 ≤ N,M ≤ 10^5', 'O(log(n+m))', 'O(1)', 'binary-search', '2 2\n1 3\n2 4', '2.5', [
    { input: '2 2\n1 3\n2 4', expectedOutput: '2.5' }, { input: '2 1\n1 2\n3', expectedOutput: '2.0' }, { input: '1 1\n1\n2', expectedOutput: '1.5' }, { input: '1 2\n1\n2 3', expectedOutput: '2.0' }
  ]),
  P('Trapping Rain Water', 'Compute how much water can be trapped.\n\n**Input:** N then N heights.\n**Output:** Trapped water units.', 'hard', 250, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'two-pointers', '12\n0 1 0 2 1 0 1 3 2 1 2 1', '6', [
    { input: '12\n0 1 0 2 1 0 1 3 2 1 2 1', expectedOutput: '6' }, { input: '4\n4 2 0 3', expectedOutput: '4' }, { input: '3\n1 2 1', expectedOutput: '0' }, { input: '5\n3 0 0 2 3', expectedOutput: '6' }
  ]),
  P('Sliding Window Maximum', 'Find the maximum in each sliding window of size K.\n\n**Input:** N, K, then N integers.\n**Output:** Max for each window.', 'hard', 250, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(k)', 'sliding-window', '8 3\n1 3 -1 -3 5 3 6 7', '3 3 5 5 6 7', [
    { input: '8 3\n1 3 -1 -3 5 3 6 7', expectedOutput: '3 3 5 5 6 7' }, { input: '5 2\n1 2 3 4 5', expectedOutput: '2 3 4 5' }, { input: '4 1\n4 3 2 1', expectedOutput: '4 3 2 1' }
  ]),
  P('Shortest Path (Dijkstra)', 'Find the shortest path from node 0 to all other nodes.\n\n**Input:** N, M edges, then edges (u v w).\n**Output:** Shortest distances.', 'hard', 250, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O((V+E) log V)', 'O(V)', 'graph', '5 5\n0 1 4\n0 2 2\n1 3 3\n2 3 1\n3 4 5', '0 4 2 3 8', [
    { input: '5 5\n0 1 4\n0 2 2\n1 3 3\n2 3 1\n3 4 5', expectedOutput: '0 4 2 3 8' }, { input: '2 1\n0 1 5', expectedOutput: '0 5' }, { input: '3 2\n0 1 1\n1 2 1', expectedOutput: '0 1 2' }
  ]),
  P('Maximum Profit (Stock)', 'Find the maximum profit from buying/selling a stock.\n\n**Input:** N then N prices.\n**Output:** Max profit.', 'medium', 150, 'java', JAVA_CODE, '1 ≤ N ≤ 10^5', 'O(n)', 'O(1)', 'greedy', '6\n7 1 5 3 6 4', '5', [
    { input: '6\n7 1 5 3 6 4', expectedOutput: '5' }, { input: '5\n7 6 4 3 1', expectedOutput: '0' }, { input: '4\n1 2 3 4', expectedOutput: '3' }, { input: '3\n2 4 1', expectedOutput: '2' }
  ]),
  P('Longest Valid Parentheses', 'Find the length of the longest valid parentheses substring.\n\n**Input:** A string.\n**Output:** Length.', 'hard', 250, 'java', JAVA_CODE, '1 ≤ len ≤ 10^5', 'O(n)', 'O(n)', 'stack', ')()())', '4', [
    { input: ')()())', expectedOutput: '4' }, { input: '(()', expectedOutput: '2' }, { input: '()', expectedOutput: '2' }, { input: '()(()', expectedOutput: '2' }
  ]),
];

// Student users to seed
const seedStudents = [
  { name: 'Aarav Sharma', email: 'aarav@coderward.com', password: 'student123', totalPointsEarned: 1250, problemsSolved: 15 },
  { name: 'Priya Patel', email: 'priya@coderward.com', password: 'student123', totalPointsEarned: 980, problemsSolved: 12 },
  { name: 'Rohan Gupta', email: 'rohan@coderward.com', password: 'student123', totalPointsEarned: 2100, problemsSolved: 25 },
  { name: 'Sneha Reddy', email: 'sneha@coderward.com', password: 'student123', totalPointsEarned: 750, problemsSolved: 9 },
  { name: 'Arjun Singh', email: 'arjun@coderward.com', password: 'student123', totalPointsEarned: 3400, problemsSolved: 38 },
  { name: 'Ananya Iyer', email: 'ananya@coderward.com', password: 'student123', totalPointsEarned: 560, problemsSolved: 7 },
  { name: 'Vikram Nair', email: 'vikram@coderward.com', password: 'student123', totalPointsEarned: 1800, problemsSolved: 20 },
  { name: 'Kavya Menon', email: 'kavya@coderward.com', password: 'student123', totalPointsEarned: 4200, problemsSolved: 45 },
  { name: 'Aditya Verma', email: 'aditya@coderward.com', password: 'student123', totalPointsEarned: 1150, problemsSolved: 14 },
  { name: 'Ishita Jain', email: 'ishita@coderward.com', password: 'student123', totalPointsEarned: 680, problemsSolved: 8 },
  { name: 'Rahul Khanna', email: 'rahul@coderward.com', password: 'student123', totalPointsEarned: 2900, problemsSolved: 32 },
  { name: 'Tanvi Desai', email: 'tanvi@coderward.com', password: 'student123', totalPointsEarned: 890, problemsSolved: 11 },
  { name: 'Karan Malhotra', email: 'karan@coderward.com', password: 'student123', totalPointsEarned: 1500, problemsSolved: 18 },
  { name: 'Divya Rao', email: 'divya@coderward.com', password: 'student123', totalPointsEarned: 2300, problemsSolved: 27 },
  { name: 'Nikhil Joshi', email: 'nikhil@coderward.com', password: 'student123', totalPointsEarned: 470, problemsSolved: 6 },
  { name: 'Meera Krishnan', email: 'meera@coderward.com', password: 'student123', totalPointsEarned: 3100, problemsSolved: 35 },
  { name: 'Siddharth Bose', email: 'siddharth@coderward.com', password: 'student123', totalPointsEarned: 720, problemsSolved: 9 },
  { name: 'Aisha Khan', email: 'aisha@coderward.com', password: 'student123', totalPointsEarned: 1950, problemsSolved: 22 },
  { name: 'Rajat Chawla', email: 'rajat@coderward.com', password: 'student123', totalPointsEarned: 5400, problemsSolved: 55 },
  { name: 'Pooja Saxena', email: 'pooja@coderward.com', password: 'student123', totalPointsEarned: 1300, problemsSolved: 16 },
  { name: 'Harsh Vardhan', email: 'harsh@coderward.com', password: 'student123', totalPointsEarned: 860, problemsSolved: 10 },
  { name: 'Riya Kapoor', email: 'riya@coderward.com', password: 'student123', totalPointsEarned: 2700, problemsSolved: 30 },
  { name: 'Manav Oberoi', email: 'manav@coderward.com', password: 'student123', totalPointsEarned: 640, problemsSolved: 8 },
  { name: 'Shreya Ghosh', email: 'shreya@coderward.com', password: 'student123', totalPointsEarned: 3800, problemsSolved: 42 },
  { name: 'Devansh Tiwari', email: 'devansh@coderward.com', password: 'student123', totalPointsEarned: 1050, problemsSolved: 13 }
];

const seedDB = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Problem.deleteMany({});
    console.log('🗑️  Cleared existing problems');

    // Clear existing students (keep admin)
    await User.deleteMany({ isAdmin: false });
    console.log('🗑️  Cleared existing students');

    // Create admin user if not exists
    let admin = await User.findOne({ email: 'admin@coderward.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Admin',
        email: 'admin@coderward.com',
        password: 'admin123',
        isAdmin: true
      });
      console.log('👤 Admin user created (admin@coderward.com / admin123)');
    }

    // Seed problems
    await Problem.insertMany(seedProblems);
    console.log(`✅ Seeded ${seedProblems.length} problems`);

    // Seed students (use create() so pre-save password hashing runs; insertMany skips it)
    const students = await User.create(seedStudents);
    console.log(`✅ Seeded ${students.length} students`);

    console.log('\n🎉 Database seeded successfully!');
    console.log(`📊 Total: ${seedProblems.length} problems, ${students.length + 1} users`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDB();