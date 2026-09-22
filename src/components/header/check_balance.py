
with open(r"d:\apptunix services\womancart_web\src\components\header\Header.tsx", "r", encoding="utf-8") as f:
    content = f.read()

stack = []
for i, char in enumerate(content):
    if char in "({[":
        stack.append((char, i))
    elif char in ")}]":
        if not stack:
            print(f"Extra closing {char} at index {i}")
            continue
        top, pos = stack.pop()
        if (top == "(" and char != ")") or (top == "{" and char != "}") or (top == "[" and char != "]"):
            print(f"Mismatch: {top} at {pos} closed by {char} at {i}")

if stack:
    for char, pos in stack:
        # Find line number
        line = content.count('\n', 0, pos) + 1
        print(f"Unclosed {char} at line {line}")
