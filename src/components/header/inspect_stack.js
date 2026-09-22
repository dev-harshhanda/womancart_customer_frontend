
const fs = require('fs');
const content = fs.readFileSync('d:\\apptunix services\\womancart_web\\src\\components\\header\\Header.tsx', 'utf8');

let stack = [];
const lines = content.split('\n');

for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    if (lineNum + 1 === 1528) {
        console.log("Stack at line 1528:");
        stack.forEach(item => console.log(`${item.char} at line ${item.line}`));
        process.exit(0);
    }
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '(' || char === '{' || char === '[') {
            stack.push({ char, line: lineNum + 1 });
        } else if (char === ')' || char === '}' || char === ']') {
            if (stack.length > 0) {
                stack.pop();
            }
        }
    }
}
