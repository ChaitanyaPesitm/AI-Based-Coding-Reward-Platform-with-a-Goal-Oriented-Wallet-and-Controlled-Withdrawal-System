const { executeCode } = require('./services/wandbox');

(async () => {
    // Test C
    const cCode = `#include <stdio.h>
int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\\n", a + b);
    return 0;
}`;
    const cResult = await executeCode(cCode, 'c', [{ input: '3 5', expectedOutput: '8' }]);
    console.log('C Result:', JSON.stringify(cResult));

    // Test Java
    const javaCode = `import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        if (n % 2 == 0) System.out.println("Even");
        else System.out.println("Odd");
    }
}`;
    const javaResult = await executeCode(javaCode, 'java', [{ input: '4', expectedOutput: 'Even' }]);
    console.log('Java Result:', JSON.stringify(javaResult));
})();