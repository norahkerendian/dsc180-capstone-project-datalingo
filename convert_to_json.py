# just run: python convert_to_json.py

import json

file_name = 'generated_level1_11Nov 4, 2025_165427'
# Step 1: Read the contents of your file
with open(f"AIGeneratedData_n8n/{file_name}.txt", "r", encoding="utf-8") as f:
    text = f.read()

# Step 2: Split into lines and remove empty ones
lines = [line.strip() for line in text.strip().split("\n") if line.strip()]

# Step 3: Create a list to hold Q&A pairs
qa_list = []

# Step 4: Loop through lines two at a time (Q then A)
for i in range(0, len(lines), 2):
    q_line = lines[i]
    a_line = lines[i + 1]

    # Extract question and answer text (everything after ": ")
    question = q_line.split(": ", 1)[1]
    answer = a_line.split(": ", 1)[1]

    qa_list.append({
        "question": question,
        "answer": answer
    })

# Step 5: Save to JSON file
with open(f"AIGeneratedData_json/{file_name}.json", "w", encoding="utf-8") as f:
    json.dump(qa_list, f, indent=4, ensure_ascii=False)

print("✅ Saved to questions.json!")
