
const fs = require('fs');
const content = fs.readFileSync('d:\\apptunix services\\womancart_web\\src\\components\\header\\Header.tsx', 'utf8');

let stack = [];
for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '(' || char === '{' || char === '[') {
        stack.push({ char, pos: i });
    } else if (char === ')' || char === '}' || char === ']') {
        if (stack.length === 0) {
            const line = content.substring(0, i).split('\n').length;
            console.log(`Extra closing ${char} at line ${line}`);
            continue;
        }
        const top = stack.pop();
        if ((top.char === '(' && char !== ')') || (top.char === '{' && char !== '}') || (top.char === '[' && char !== ']')) {
            const line = content.substring(0, i).split('\n').length;
            const topLine = content.substring(0, top.pos).split('\n').length;
            console.log(`Mismatch: ${top.char} at line ${topLine} closed by ${char} at line ${line}`);
        }
    }
}

if (stack.length > 0) {
    stack.forEach(item => {
        const line = content.substring(0, item.pos).split('\n').length;
        console.log(`Unclosed ${item.char} at line ${line}`);
    });
}
