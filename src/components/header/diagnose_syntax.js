
const fs = require('fs');
const content = fs.readFileSync('d:\\apptunix services\\womancart_web\\src\\components\\header\\Header.tsx', 'utf8');

let stack = [];
const lines = content.split('\n');

for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '(' || char === '{' || char === '[') {
            stack.push({ char, line: lineNum + 1 });
        } else if (char === ')' || char === '}' || char === ']') {
            if (stack.length === 0) {
                console.log(`Extra closing ${char} at line ${lineNum + 1}`);
                continue;
            }
            const top = stack.pop();
            const expected = top.char === '(' ? ')' : top.char === '{' ? '}' : ']';
            if (char !== expected) {
                console.log(`Mismatch at line ${lineNum + 1}: expected ${expected} (to close ${top.char} at line ${top.line}), but found ${char}`);
                // Optimization: stop at first mismatch usually
                process.exit(0);
            }
        }
    }
}

if (stack.length > 0) {
    console.log("Remaining unclosed items:");
    stack.forEach(item => console.log(`${item.char} at line ${item.line}`));
} else {
    console.log("Balanced!");
}
