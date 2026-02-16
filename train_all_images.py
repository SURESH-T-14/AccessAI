#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gesture Classifier Training - ALL IMAGES
Trains on ALL hand gesture images (1-9, A-Z) using MediaPipe's hand landmarker task file
Uses archive (1)\Indian folder with all available training data
"""

import os
import pickle
import random
import cv2
import numpy as np
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import warnings
warnings.filterwarnings('ignore')

# MediaPipe imports
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

print("[TRAINING] Gesture Classifier - Training on ALL Images")
print("=" * 70)

# ============================================================================
# CONFIGURATION
# ============================================================================
DATA_PATH = r"archive (1)\Indian"  # Using archive (1)\Indian
TASK_FILE = "hand_landmarker.task"
OUTPUT_MODEL = "gesture_classifier.pkl"
OUTPUT_SCALER = "gesture_scaler.pkl"
OUTPUT_CLASS_MAP = "gesture_class_map.pkl"

# ============================================================================
# STEP 1: Verify data path
# ============================================================================
print("\n[1/7] Verifying data path and counting images...")
if not os.path.exists(DATA_PATH):
    print(f"ERROR: Data path not found: {DATA_PATH}")
    exit(1)

if not os.path.exists(TASK_FILE):
    print(f"ERROR: Task file not found: {TASK_FILE}")
    exit(1)

gesture_folders = sorted([d for d in os.listdir(DATA_PATH) if os.path.isdir(os.path.join(DATA_PATH, d))])
print(f"[OK] Found {len(gesture_folders)} gesture classes")

# Count total images
total_image_count = 0
for gesture_class in gesture_folders:
    class_path = os.path.join(DATA_PATH, gesture_class)
    count = len([f for f in os.listdir(class_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp'))])
    total_image_count += count
    print(f"      {gesture_class:2s}: {count:4d} images")

print(f"\n[OK] Total images to process: {total_image_count}")

# ============================================================================
# STEP 2: Initialize MediaPipe HandLandmarker with task file
# ============================================================================
print(f"\n[2/7] Initializing MediaPipe HandLandmarker from {TASK_FILE}...")
try:
    base_options = python.BaseOptions(model_asset_path=TASK_FILE)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=1,
        min_hand_detection_confidence=0.5
    )
    detector = vision.HandLandmarker.create_from_options(options)
    print(f"[OK] HandLandmarker initialized successfully")
except Exception as e:
    print(f"ERROR initializing HandLandmarker: {e}")
    exit(1)

# ============================================================================
# STEP 3: Extract landmarks from ALL images
# ============================================================================
print(f"\n[3/7] Extracting hand landmarks from ALL images...")
print(f"      (This may take several minutes depending on image count)\n")

X = []
y = []
class_to_idx = {cls_name: idx for idx, cls_name in enumerate(gesture_folders)}
idx_to_class = {idx: cls_name for cls_name, idx in class_to_idx.items()}

total_processed = 0
successful = 0

for gesture_class in gesture_folders:
    class_path = os.path.join(DATA_PATH, gesture_class)
    image_files = [f for f in os.listdir(class_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp'))]
    
    class_successful = 0
    
    for idx, img_file in enumerate(image_files):
        img_path = os.path.join(class_path, img_file)
        total_processed += 1
        
        try:
            # Read and process image
            image = cv2.imread(img_path)
            if image is None:
                continue
            
            # Validate image dimensions
            if image.shape[0] < 10 or image.shape[1] < 10:
                continue
            
            # Convert BGR to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Create MediaPipe Image
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            
            # Detect hand landmarks
            results = detector.detect(mp_image)
            
            if results.hand_landmarks and len(results.hand_landmarks) > 0:
                # Extract landmarks (21 points x 3 coordinates = 63 features)
                landmarks = results.hand_landmarks[0]
                landmark_list = []
                
                for landmark in landmarks:
                    landmark_list.extend([landmark.x, landmark.y, landmark.z])
                
                if len(landmark_list) == 63:
                    X.append(landmark_list)
                    y.append(class_to_idx[gesture_class])
                    successful += 1
                    class_successful += 1
        except KeyboardInterrupt:
            raise
        except Exception as e:
            continue
        
        # Progress indicator
        if (idx + 1) % 100 == 0:
            print(f"      [{gesture_class}] Processed {idx + 1}/{len(image_files)} images")
    
    print(f"      [{gesture_class:2s}] Extracted {class_successful}/{len(image_files)} landmarks")

print(f"\n[OK] Successfully extracted {successful}/{total_processed} landmark sets")

if successful < 100:
    print(f"WARNING: Only {successful} images processed. Please check image quality.")
    if successful < 50:
        print("ERROR: Not enough training samples!")
        exit(1)

# ============================================================================
# STEP 4: Data augmentation (4x multiplication)
# ============================================================================
print(f"\n[4/7] Applying data augmentation (4x multiplication)...")

X_original = np.array(X)
y_original = np.array(y)

X_augmented = [X_original.copy()]
y_augmented = [y_original.copy()]

# Augmentation 1: Flip horizontally
X_flip = X_original.copy()
for i in range(len(X_flip)):
    for j in range(21):
        X_flip[i, j*3] = 1.0 - X_flip[i, j*3]
X_augmented.append(X_flip)
y_augmented.append(y_original.copy())

# Augmentation 2: Add noise (scale)
X_scale = X_original + np.random.normal(0, 0.02, X_original.shape)
X_augmented.append(np.clip(X_scale, 0, 1))
y_augmented.append(y_original.copy())

# Augmentation 3: Shift landmarks
X_shift = X_original.copy()
for i in range(len(X_shift)):
    shift = np.random.uniform(-0.05, 0.05)
    for j in range(21):
        X_shift[i, j*3] = np.clip(X_shift[i, j*3] + shift, 0, 1)
X_augmented.append(X_shift)
y_augmented.append(y_original.copy())

X_combined = np.vstack(X_augmented)
y_combined = np.hstack(y_augmented)

print(f"[OK] Augmented dataset: {len(X_combined)} samples ({len(X_original)} x 4)")

# ============================================================================
# STEP 5: Train-test split and preprocessing
# ============================================================================
print(f"\n[5/7] Preparing data (train-test split)...")

X_train, X_test, y_train, y_test = train_test_split(
    X_combined, y_combined, test_size=0.2, random_state=42, stratify=y_combined
)

print(f"[OK] Train set: {len(X_train)} samples")
print(f"[OK] Test set: {len(X_test)} samples")

# Normalize features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print(f"[OK] Features normalized using StandardScaler")

# ============================================================================
# STEP 6: Train RandomForest classifier
# ============================================================================
print(f"\n[6/7] Training RandomForest classifier...")
print(f"      (This may take 1-2 minutes)\n")

model = RandomForestClassifier(
    n_estimators=400,
    max_depth=30,
    min_samples_split=5,
    min_samples_leaf=2,
    class_weight='balanced',
    n_jobs=-1,
    random_state=42,
    verbose=0
)

model.fit(X_train_scaled, y_train)

# Evaluate
y_pred = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)

print(f"[OK] Model training complete!")
print(f"\n[RESULTS] Test Accuracy: {accuracy*100:.2f}%")

# Per-class metrics
print(f"\n[DETAILED RESULTS]")
print(f"{'-' * 70}")
report = classification_report(
    y_test, y_pred,
    target_names=gesture_folders,
    digits=3,
    zero_division=0
)
print(report)

# ============================================================================
# STEP 7: Save model and artifacts
# ============================================================================
print(f"\n[7/7] Saving model and artifacts...")

try:
    # Save model
    with open(OUTPUT_MODEL, 'wb') as f:
        pickle.dump(model, f)
    print(f"[OK] Model saved: {OUTPUT_MODEL}")
    
    # Save scaler
    with open(OUTPUT_SCALER, 'wb') as f:
        pickle.dump(scaler, f)
    print(f"[OK] Scaler saved: {OUTPUT_SCALER}")
    
    # Save class mapping
    with open(OUTPUT_CLASS_MAP, 'wb') as f:
        pickle.dump({'class_to_idx': class_to_idx, 'idx_to_class': idx_to_class}, f)
    print(f"[OK] Class mapping saved: {OUTPUT_CLASS_MAP}")
    
except Exception as e:
    print(f"ERROR saving files: {e}")
    exit(1)

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print(f"\n" + "=" * 70)
print(f"[SUCCESS] TRAINING COMPLETE!")
print(f"=" * 70)
print(f"\nTraining Summary:")
print(f"  - Total images processed: {total_processed}")
print(f"  - Successful landmarks extracted: {successful}")
print(f"  - Training samples: {len(X_train)}")
print(f"  - Test samples: {len(X_test)}")
print(f"  - Gesture classes: {len(gesture_folders)} (1-9, A-Z)")
print(f"  - Final accuracy: {accuracy*100:.2f}%")
print(f"\nModel files saved:")
print(f"  - {OUTPUT_MODEL}")
print(f"  - {OUTPUT_SCALER}")
print(f"  - {OUTPUT_CLASS_MAP}")
print(f"\nNext step: Restart Flask backend to load new model")
print(f"=" * 70)
