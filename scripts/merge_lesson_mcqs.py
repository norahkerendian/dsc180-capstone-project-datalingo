#!/usr/bin/env python3
"""
Merge MCQ questions into lesson data by matching lesson IDs.
Provides detailed reporting on matched and unmatched records.
"""

import json
import sys
from pathlib import Path
from datetime import datetime


def load_json_file(filepath):
    """Load and parse a JSON file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found: {filepath}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {filepath}: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        sys.exit(1)


def merge_lesson_mcqs(lessons_data, mcqs_data):
    """
    Merge MCQ questions into lesson data by matching IDs.
    Returns merged data and detailed statistics.
    """
    mcq_lookup = {}
    for mcq_entry in mcqs_data:
        lesson_id = str(mcq_entry.get('lessonID', ''))
        if lesson_id:
            mcq_lookup[lesson_id] = mcq_entry.get('mcq_questions', [])
    
    stats = {
        'total_lessons': len(lessons_data),
        'total_mcq_entries': len(mcqs_data),
        'matched': [],
        'lessons_without_mcqs': [],
        'mcqs_without_lessons': []
    }
    
    merged_lessons = []
    for lesson in lessons_data:
        lesson_id = str(lesson.get('id', ''))
        lesson_copy = lesson.copy()
        
        if lesson_id in mcq_lookup:
            lesson_copy['mcq_questions'] = mcq_lookup[lesson_id]
            stats['matched'].append({
                'id': lesson_id,
                'title': lesson.get('title', 'N/A'),
                'mcq_count': len(mcq_lookup[lesson_id])
            })
        else:
            lesson_copy['mcq_questions'] = []
            stats['lessons_without_mcqs'].append({
                'id': lesson_id,
                'title': lesson.get('title', 'N/A'),
                'slug': lesson.get('slug', 'N/A')
            })
        
        merged_lessons.append(lesson_copy)
    
    lesson_ids = {str(lesson.get('id', '')) for lesson in lessons_data}
    for mcq_entry in mcqs_data:
        mcq_lesson_id = str(mcq_entry.get('lessonID', ''))
        if mcq_lesson_id and mcq_lesson_id not in lesson_ids:
            stats['mcqs_without_lessons'].append({
                'lessonID': mcq_lesson_id,
                'mcq_count': len(mcq_entry.get('mcq_questions', []))
            })
    
    return merged_lessons, stats


def print_report(stats):
    """Print a detailed report of the merge operation."""
    print("\n" + "="*70)
    print("MERGE REPORT")
    print("="*70)
    
    print(f"\nSUMMARY:")
    print(f"  Total lessons: {stats['total_lessons']}")
    print(f"  Total MCQ entries: {stats['total_mcq_entries']}")
    print(f"  Successfully matched: {len(stats['matched'])}")
    print(f"  Lessons without MCQs: {len(stats['lessons_without_mcqs'])}")
    print(f"  MCQs without matching lessons: {len(stats['mcqs_without_lessons'])}")
    
    if stats['matched']:
        print(f"\nSUCCESSFULLY MATCHED ({len(stats['matched'])}):")
        for match in stats['matched']:
            print(f"  • ID {match['id']}: {match['title']} ({match['mcq_count']} MCQs)")
    
    if stats['lessons_without_mcqs']:
        print(f"\nLESSONS WITHOUT MCQs ({len(stats['lessons_without_mcqs'])}):")
        for lesson in stats['lessons_without_mcqs']:
            print(f"  • ID {lesson['id']}: {lesson['title']}")
            print(f"    Slug: {lesson['slug']}")
    
    if stats['mcqs_without_lessons']:
        print(f"\nMCQs WITHOUT MATCHING LESSONS ({len(stats['mcqs_without_lessons'])}):")
        print("  These MCQ entries could not be matched to any lesson:")
        for mcq in stats['mcqs_without_lessons']:
            print(f"  • Lesson ID {mcq['lessonID']}: {mcq['mcq_count']} MCQ(s)")
    
    print("\n" + "="*70 + "\n")


def main():
    """Main execution function."""
    lessons_file = "../NEW_AIGeneratedData_json/final_generated_level5_02Feb 16, 2026_184017.json"
    mcqs_file = "../NEW_AIGeneratedData_json/MCQ_generated_level5_02Feb 25, 2026_041753.json"
    level = 5
    timestamp = datetime.now().strftime("%d%b %d, %Y_%H%M%S")
    output_file = f"../NEW_AIGeneratedData_json/merged_lessons_with_mcqs_level{level}_{timestamp}.json"
    
    print("Starting merge process...")
    print(f"Reading lessons from: {lessons_file}")
    print(f"Reading MCQs from: {mcqs_file}")
    
    lessons_data = load_json_file(lessons_file)
    mcqs_data = load_json_file(mcqs_file)
    
    merged_data, stats = merge_lesson_mcqs(lessons_data, mcqs_data)
    
    print_report(stats)
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(merged_data, f, indent=2, ensure_ascii=False)
        print(f"Successfully saved merged data to: {output_file}")
        print(f"Total records in output: {len(merged_data)}")
    except Exception as e:
        print(f"Error saving output file: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()