#!/usr/bin/env python3
"""
Train improved gesture classifier on ALL available gesture images
Uses both D:\image for training (A-Z) and archive folders (1-6)
"""
import os
import cv2
import numpy as np
import mediapipe
from mediapipe.tasks.python import vision
from mediapipe.tasks import python
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import pickle
import sys
import random
from pathlib import Path

MODEL_PATH = r"c:\ai bot base\hand_landmarker.task"

# Define multiple data sources
DATA_SOURCES = [
    (r"D:\image for training", "letter"),  # A-Z
    (r"D:\ai bot base\archive (1)\indian", "number"),  # 1-6
]

OUTPUT_DIR = r"c:\ai bot base"

print("="*70)
print("COMPREHENSIVE GESTURE CLASSIFIER TRAINER")
print("="*70)
print(f"Model: {MODEL_PATH}")
print(f"Output: {OUTPUT_DIR}")
print(f"Data sources: {len(DATA_SOURCES)}")

# Collect all training data from all sources
all_data_path = {}
all_classes = set()

for data_path, source_type in DATA_SOURCES:
    if not os.path.exists(data_path):
        print(f"[!] Data source not found: {data_path}")
        continue
    
    print(f"\n[*] Scanning {source_type} data: {data_path}")
    class_dirs = sorted([d for d in os.listdir(data_path) 
                        if os.path.isdir(os.path.join(data_path, d))])
    
    for class_name in class_dirs:
        all_data_path[class_name] = os.path.join(data_path, class_name)
        all_classes.add(class_name)
    
    print(f"    Found classes: {', '.join(sorted(class_dirs))}")

all_classes = sorted(list(all_classes))

print(f"\n{'='*70}")
print(f"TOTAL GESTURE CLASSES FOUND: {len(all_classes)}")
print(f"Classes: {', '.join(all_classes)}")
print(f"{'='*70}")

if len(all_classes) == 0:
    print("[ERROR] No gesture data found!")
    sys.exit(1)

# Initialize MediaPipe Hand Landmarker
print("\n[1/5] Initializing MediaPipe Hand Landmarker...")
base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.HandLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.IMAGE,
    num_hands=1,
    min_hand_detection_confidence=0.5,
    min_hand_presence_confidence=0.5,
    min_tracking_confidence=0.5
)

landmarker = vision.HandLandmarker.create_from_options(options)
print("[OK] Hand Landmarker initialized")

# Extract features
print("\n[2/5] Extracting hand landmarks from images...")

features_list = []
labels_list = []
class_mapping = {}

for class_idx, gesture_class in enumerate(all_classes):
    class_mapping[class_idx] = gesture_class
    class_path = all_data_path[gesture_class]
    images = [f for f in os.listdir(class_path) 
             if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    if not images:
        print(f"  [{gesture_class:2}] No images found")
        continue
    
    # Sample images for faster training
    sampled_images = random.sample(images, min(50, len(images)))
    extracted = 0
    
    for image_name in sampled_images:
        try:
            image_path = os.path.join(class_path, image_name)
            img = cv2.imread(image_path)
            if img is None:
                continue
            
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            mp_image = mediapipe.Image(image_format=mediapipe.ImageFormat.SRGB, data=rgb_img)
            
            results = landmarker.detect(mp_image)
            
            if results.hand_landmarks and len(results.hand_landmarks) > 0:
                landmarks = results.hand_landmarks[0]
                features = []
                for landmark in landmarks:
                    features.extend([landmark.x, landmark.y, landmark.z])
                
                features_list.append(features)
                labels_list.append(class_idx)
                extracted += 1
                
                # Data augmentation (slight variations)
                for _ in range(4):
                    aug_features = [f + np.random.normal(0, 0.02) for f in features]
                    features_list.append(aug_features)
                    labels_list.append(class_idx)
        except Exception as e:
            pass
    
    status = "[OK]" if extracted > 0 else "[FAIL]"
    print(f"  [{gesture_class:2}] {len(sampled_images):3} images -> {extracted:2} extracted + {extracted*4:2} augmented {status}")

print(f"\nTotal samples collected: {len(features_list)}")
print(f"Feature matrix shape: ({len(features_list)}, {len(features_list[0]) if features_list else 0})")
print(f"Labels shape: ({len(labels_list)},)")

# Prepare data
print("\n[3/5] Splitting train/test (80/20 stratified)...")
X_train, X_test, y_train, y_test = train_test_split(
    features_list, labels_list, test_size=0.2, stratify=labels_list, random_state=42
)

print(f"  Training samples: {len(X_train)}")
print(f"  Test samples: {len(X_test)}")

# Train model
print("\n[4/5] Training RandomForest classifier...")
print("  Parameters:")
print("    - n_estimators: 500")
print("    - max_depth: 30")
print("    - class_weight: balanced")

gesture_model = RandomForestClassifier(
    n_estimators=500,
    max_depth=30,
    min_samples_split=2,
    class_weight='balanced',
    n_jobs=-1,
    random_state=42
)

gesture_model.fit(X_train, y_train)
print("[OK] Model trained")

# Evaluate
print("\n[5/5] Evaluating model...")

y_train_pred = gesture_model.predict(X_train)
train_accuracy = accuracy_score(y_train, y_train_pred)

y_test_pred = gesture_model.predict(X_test)
test_accuracy = accuracy_score(y_test, y_test_pred)

print(f"\n{'='*70}")
print("PERFORMANCE METRICS:")
print(f"{'='*70}")
print(f"Training Accuracy: {train_accuracy*100:.2f}%")
print(f"Test Accuracy:     {test_accuracy*100:.2f}%")

print(f"\n{'='*70}")
print("PER-CLASS ACCURACY (Test Set):")
print(f"{'='*70}")

try:
    print(f"{'Gesture':<10} {'Accuracy':<15} {'Samples':<10}")
    print("-" * 40)

    for class_idx in range(len(all_classes)):
        class_mask = np.array(y_test) == class_idx
        class_samples = np.where(class_mask)[0]
        if len(class_samples) > 0:
            class_accuracy = accuracy_score(
                np.array(y_test)[class_samples], 
                y_test_pred[class_samples]
            )
            gesture_name = class_mapping[class_idx]
            print(f"{gesture_name:<10} {class_accuracy*100:>6.2f}%         {len(class_samples):>7}")
except Exception as e:
    print(f"[Note] Per-class accuracy calculation skipped: {e}")
    print("Overall performance above is accurate.")

print()

# Feature importance
print(f"\n{'='*70}")
print("TOP 10 IMPORTANT FEATURES:")
print(f"{'='*70}")
importances = gesture_model.feature_importances_
top_indices = np.argsort(importances)[-10:][::-1]

for rank, idx in enumerate(top_indices, 1):
    landmark_num = idx // 3
    coord = ['X', 'Y', 'Z'][idx % 3]
    importance = importances[idx]
    print(f"  {rank:2}. Landmark {landmark_num} ({coord}): {importance:.4f}")

# Save models
print(f"\n{'='*70}")
print("SAVING MODELS:")
print(f"{'='*70}")

model_path = os.path.join(OUTPUT_DIR, "gesture_classifier_comprehensive.pkl")
class_map_path = os.path.join(OUTPUT_DIR, "gesture_class_map_comprehensive.pkl")

with open(model_path, 'wb') as f:
    pickle.dump(gesture_model, f)

with open(class_map_path, 'wb') as f:
    pickle.dump(class_mapping, f)

print(f"[✓] Model saved: {model_path}")
print(f"[✓] Class mapping saved: {class_map_path}")
print(f"    Gesture classes: {', '.join(all_classes)}")

print(f"\n{'='*70}")
print("✅ TRAINING COMPLETE!")
print(f"{'='*70}")
print("NEXT STEPS:")
print("1. Update gesture_api_server_simple.py to use 'gesture_classifier_comprehensive.pkl'")
print("2. Restart the Flask backend")
print(f"3. Test all {len(all_classes)} gesture classes")
print(f"{'='*70}\n")
