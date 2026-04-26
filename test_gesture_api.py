#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test gesture recognition API directly without browser
Tests confidence levels with actual images
"""
import requests
import os
import cv2
import base64
import json
from pathlib import Path
import sys
import io

# Fix encoding for Windows console
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# API endpoint
API_URL = "http://localhost:5000/api/process-frame"

# Test data path
TEST_DATA_PATH = r"D:\ai bot base\archive (1)\indian"

def encode_image_to_base64(image_path):
    """Encode image to base64 for API transmission"""
    with open(image_path, 'rb') as img_file:
        return base64.b64encode(img_file.read()).decode('utf-8')

def test_gesture_recognition(image_path):
    """Test gesture recognition on a single image"""
    try:
        # Read and encode image
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')
        
        # Send to API - expects 'frame' field
        payload = {
            'frame': image_data
        }
        
        response = requests.post(API_URL, json=payload, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            gesture = result.get('gesture', 'None')
            confidence = result.get('confidence', 0)
            return gesture, confidence, True
        else:
            print(f"      [API ERROR] Status: {response.status_code}, Response: {response.text[:100]}")
            return None, 0, False
            
    except Exception as e:
        print(f"[ERROR] {e}")
        return None, 0, False

def main():
    """Test multiple images from each gesture class"""
    print("="*70)
    print("GESTURE RECOGNITION API TEST")
    print("="*70)
    print(f"API: {API_URL}")
    print(f"Test data: {TEST_DATA_PATH}")
    print("="*70)
    
    if not os.path.exists(TEST_DATA_PATH):
        print(f"[ERROR] Test data path not found: {TEST_DATA_PATH}")
        return
    
    # Get gesture classes
    gesture_classes = sorted([d for d in os.listdir(TEST_DATA_PATH) 
                             if os.path.isdir(os.path.join(TEST_DATA_PATH, d))])
    
    print(f"\nFound gesture classes: {', '.join(gesture_classes)}\n")
    
    total_tests = 0
    total_correct = 0
    results_by_class = {}
    
    # Test each gesture class
    for gesture_class in gesture_classes:
        class_path = os.path.join(TEST_DATA_PATH, gesture_class)
        images = [f for f in os.listdir(class_path) 
                 if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        if not images:
            continue
        
        # Test first 5 images of each class
        test_images = images[:5]
        class_results = []
        correct_count = 0
        
        print(f"\n{'='*70}")
        print(f"Testing Gesture: {gesture_class} ({len(test_images)} samples)")
        print(f"{'='*70}")
        
        for idx, image_name in enumerate(test_images, 1):
            image_path = os.path.join(class_path, image_name)
            detected_gesture, confidence, success = test_gesture_recognition(image_path)
            
            if success:
                is_correct = detected_gesture == gesture_class
                correct_count += 1 if is_correct else 0
                status = "[OK]" if is_correct else "[FAIL]"
                
                print(f"  [{idx}] {image_name[:30]:30} | " 
                      f"Detected: {str(detected_gesture):3} | "
                      f"Confidence: {confidence*100:5.1f}% {status}")
                
                class_results.append({
                    'image': image_name,
                    'detected': detected_gesture,
                    'confidence': confidence,
                    'correct': is_correct
                })
            else:
                print(f"  [{idx}] {image_name[:30]:30} | [FAILED]")
        
        # Summary for this class
        accuracy = (correct_count / len(test_images)) * 100 if test_images else 0
        avg_confidence = sum(r['confidence'] for r in class_results) / len(class_results) if class_results else 0
        
        print(f"\n  Class Accuracy: {accuracy:.1f}% ({correct_count}/{len(test_images)})")
        print(f"  Avg Confidence: {avg_confidence*100:.1f}%")
        
        results_by_class[gesture_class] = {
            'accuracy': accuracy,
            'avg_confidence': avg_confidence,
            'samples_tested': len(test_images),
            'correct': correct_count
        }
        
        total_tests += len(test_images)
        total_correct += correct_count
    
    # Overall summary
    print(f"\n{'='*70}")
    print("OVERALL SUMMARY")
    print(f"{'='*70}")
    overall_accuracy = (total_correct / total_tests) * 100 if total_tests > 0 else 0
    
    print(f"\nTotal Tests: {total_tests}")
    print(f"Correct: {total_correct}")
    print(f"Overall Accuracy: {overall_accuracy:.1f}%\n")
    
    print("Per-Class Performance:")
    print(f"{'Class':<10} {'Accuracy':<12} {'Avg Confidence':<18} {'Samples':<10}")
    print("-" * 50)
    
    for gesture_class in gesture_classes:
        if gesture_class in results_by_class:
            result = results_by_class[gesture_class]
            print(f"{gesture_class:<10} {result['accuracy']:>6.1f}%       "
                  f"{result['avg_confidence']*100:>6.1f}%            "
                  f"{result['samples_tested']:>7}")
    
    print("="*70)
    print("[✓] TEST COMPLETE")
    print("="*70)

if __name__ == '__main__':
    main()
