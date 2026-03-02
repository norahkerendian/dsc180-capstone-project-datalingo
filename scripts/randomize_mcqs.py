import json
import random
from pathlib import Path
from datetime import datetime

def randomize_mcq_answers(input_file, output_file=None):
    """
    Randomize the position of answers in MCQ questions.
    
    Args:
        input_file (str): Path to the input JSON file
        output_file (str, optional): Path to the output JSON file. 
                                    If None, will auto-generate based on input filename.
    
    Returns:
        dict: Statistics about the randomization process
    """
    print(f"Reading file: {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    total_lessons = len(data)
    total_mcqs = 0
    randomized_mcqs = 0
    
    for lesson in data:
        if 'mcq_questions' not in lesson or not lesson['mcq_questions']:
            continue
        
        for mcq in lesson['mcq_questions']:
            if 'choices' not in mcq or 'answerIndex' not in mcq:
                continue
            
            total_mcqs += 1
            
            correct_answer = mcq['choices'][mcq['answerIndex']]
            
            num_choices = len(mcq['choices'])
            indices = list(range(num_choices))
            random.shuffle(indices)
            
            shuffled_choices = [mcq['choices'][i] for i in indices]
            
            new_answer_index = shuffled_choices.index(correct_answer)
            
            mcq['choices'] = shuffled_choices
            mcq['answerIndex'] = new_answer_index
            
            randomized_mcqs += 1
    
    if output_file is None:
        input_path = Path(input_file)
        timestamp = datetime.now().strftime("%d%b_%H%M%S")
        output_file = input_path.parent / f"{input_path.stem}_randomized_{timestamp}.json"
    
    print(f"Writing randomized data to: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    stats = {
        'total_lessons': total_lessons,
        'total_mcqs': total_mcqs,
        'randomized_mcqs': randomized_mcqs,
        'output_file': str(output_file)
    }
    
    print("\n" + "="*50)
    print("RANDOMIZATION COMPLETE!")
    print("="*50)
    print(f"Total lessons processed: {stats['total_lessons']}")
    print(f"Total MCQ questions found: {stats['total_mcqs']}")
    print(f"MCQ questions randomized: {stats['randomized_mcqs']}")
    print(f"Output saved to: {stats['output_file']}")
    print("="*50)
    
    return stats


def verify_randomization(input_file, output_file):
    """
    Verify that randomization was successful by checking answer positions.
    
    Args:
        input_file (str): Path to the original JSON file
        output_file (str): Path to the randomized JSON file
    """
    with open(input_file, 'r', encoding='utf-8') as f:
        original_data = json.load(f)
    
    with open(output_file, 'r', encoding='utf-8') as f:
        randomized_data = json.load(f)
    
    position_counts = {i: 0 for i in range(10)}  
    total_checked = 0
    
    for orig_lesson, rand_lesson in zip(original_data, randomized_data):
        if 'mcq_questions' not in orig_lesson:
            continue
        
        for orig_mcq, rand_mcq in zip(orig_lesson['mcq_questions'], 
                                       rand_lesson['mcq_questions']):
            orig_correct = orig_mcq['choices'][orig_mcq['answerIndex']]
            rand_correct = rand_mcq['choices'][rand_mcq['answerIndex']]
            
            assert orig_correct == rand_correct, "Correct answer mismatch!"
            
            position_counts[rand_mcq['answerIndex']] += 1
            total_checked += 1
    
    print("\n" + "="*50)
    print("VERIFICATION RESULTS")
    print("="*50)
    print(f"Total MCQs verified: {total_checked}")
    print("\nAnswer position distribution:")
    for position, count in sorted(position_counts.items()):
        if count > 0:
            percentage = (count / total_checked) * 100
            print(f"  Position {position}: {count} ({percentage:.1f}%)")
    print("="*50)


if __name__ == "__main__":
    input_filename = "../NEW_AIGeneratedData_json/merged_lessons_with_mcqs_level5_02Mar 02, 2026_105919.json"
    
    stats = randomize_mcq_answers(input_filename)
    
    verify_randomization(input_filename, stats['output_file'])