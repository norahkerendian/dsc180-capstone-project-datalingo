import json

file_name = "final_generated_level1_12Dec 26, 2025_165633"
# Path to your input TXT file
input_file = f"../NEW_AIGeneratedData_n8n/{file_name}.txt"

# Path to the output JSON file
output_file = f"../NEW_AIGeneratedData_json/{file_name}.json"

# Read the TXT file
with open(input_file, "r", encoding="utf-8") as f:
    data = json.load(f)  # Load as JSON

# Write to JSON file
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)  # Pretty print with 2-space indentation

print(f"Saved JSON data to {output_file}")
