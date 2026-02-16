#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gesture Classifier Training with hand_landmarker.task
Trains on hand gesture images (1-9, A-Z) using MediaPipe's hand landmarker task file
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
from sklearn.metrics import accuracy_score, classification_report

# MediaPipe imports
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

print("[GESTURE CLASSIFIER] Training with hand_landmarker.task")
print("=" * 60)

# ============================================================================
# CONFIGURATION
# ============================================================================
DATA_PATH = "archive (1)\\indian"
TASK_FILE = "hand_landmarker.task"
MAX_IMAGES_PER_CLASS = 50  # Sample images to speed up training
OUTPUT_MODEL = "gesture_classifier.pkl"
OUTPUT_SCALER = "gesture_scaler.pkl"
OUTPUT_CLASS_MAP = "gesture_class_map.pkl"

# ============================================================================
# STEP 1: Verify data path
# ============================================================================
print(f"\n[1/6] Verifying data path...")
if not os.path.exists(DATA_PATH):
    print(f"❌ ERROR: Data path not found: {DATA_PATH}")
    exit(1)

if not os.path.exists(TASK_FILE):
    print(f"❌ ERROR: Task file not found: {TASK_FILE}")
    exit(1)

gesture_folders = sorted([d for d in os.listdir(DATA_PATH) if os.path.isdir(os.path.join(DATA_PATH, d))])
print(f"✅ Found {len(gesture_folders)} gesture classes: {', '.join(gesture_folders)}")

# ============================================================================
# STEP 2: Initialize MediaPipe HandLandmarker with task file
# ============================================================================
print(f"\n[2/6] Initializing MediaPipe HandLandmarker from {TASK_FILE}...")
try:
    base_options = python.BaseOptions(model_asset_path=TASK_FILE)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=1,  # Single hand detection
        min_hand_detection_confidence=0.5
    )
    detector = vision.HandLandmarker.create_from_options(options)
    print(f"✅ HandLandmarker initialized successfully")
except Exception as e:
    print(f"❌ ERROR initializing HandLandmarker: {e}")
    exit(1)

# ============================================================================
# STEP 3: Extract landmarks from images (sampled)
# ============================================================================
print(f"\n[3/6] Extracting hand landmarks from images (sampling {MAX_IMAGES_PER_CLASS} per class)...")

X = []  # Features (landmarks)
y = []  # Labels (gesture classes)
class_to_idx = {cls_name: idx for idx, cls_name in enumerate(gesture_folders)}
idx_to_class = {idx: cls_name for cls_name, idx in class_to_idx.items()}

total_images = 0
successful = 0

for gesture_class in gesture_folders:
    class_path = os.path.join(DATA_PATH, gesture_class)
    image_files = [f for f in os.listdir(class_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp'))]
    
    # Sample images if too many
    if len(image_files) > MAX_IMAGES_PER_CLASS:
        image_files = random.sample(image_files, MAX_IMAGES_PER_CLASS)
        print(f"  [{gesture_class:2s}] {len(image_files):3d} images (sampled from {len(os.listdir(class_path))})")
    else:
        print(f"  [{gesture_class:2s}] {len(image_files):3d} images")
    
    total_images += len(image_files)
    
    for img_file in image_files:
        img_path = os.path.join(class_path, img_file)
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
                # Extract landmarks (21 points × 3 coordinates = 63 features)
                landmarks = results.hand_landmarks[0]
                landmark_list = []
                
                for landmark in landmarks:
                    landmark_list.extend([landmark.x, landmark.y, landmark.z])
                
                if len(landmark_list) == 63:  # Verify we have all 21 points
                    X.append(landmark_list)
                    y.append(class_to_idx[gesture_class])
                    successful += 1
        except KeyboardInterrupt:
            raise
        except Exception as e:
            # Silently skip problematic images
            continue

print(f"✅ Successfully extracted {successful}/{total_images} landmark sets")

if successful < 100:
    print(f"⚠️  WARNING: Only {successful} images processed. Consider checking image quality.")

# ============================================================================
# STEP 4: Data augmentation
# ============================================================================
print(f"\n[4/6] Applying data augmentation (4x multiplication)...")

X_original = np.array(X)
y_original = np.array(y)

X_augmented = [X_original.copy()]
y_augmented = [y_original.copy()]

# Augmentation 1: Flip horizontally (swap left/right landmarks)
X_flip = X_original.copy()
for i in range(0, len(X_flip), 63):
    if i + 63 <= len(X_flip):
        for j in range(21):
            X_flip[i + j*3] = 1.0 - X_flip[i + j*3]  # Flip x coordinate
X_augmented.append(X_flip)
y_augmented.append(y_original.copy())

# Augmentation 2: Scale (add slight noise)
X_scale = X_original + np.random.normal(0, 0.02, X_original.shape)
X_augmented.append(np.clip(X_scale, 0, 1))
y_augmented.append(y_original.copy())

# Augmentation 3: Shift (translate landmarks)
X_shift = X_original.copy()
for i in range(0, len(X_shift), 63):
    if i + 63 <= len(X_shift):
        shift = np.random.uniform(-0.05, 0.05)
        for j in range(21):
            X_shift[i + j*3] = np.clip(X_shift[i + j*3] + shift, 0, 1)
X_augmented.append(X_shift)
y_augmented.append(y_original.copy())

X_combined = np.vstack(X_augmented)
y_combined = np.hstack(y_augmented)

print(f"✅ Augmented dataset: {len(X_combined)} samples (4x of {len(X_original)})")

# ============================================================================
# STEP 5: Train RandomForest classifier
# ============================================================================
print(f"\n[5/6] Training RandomForest classifier...")

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X_combined, y_combined, test_size=0.2, random_state=42, stratify=y_combined
)

# Normalize features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train model
model = RandomForestClassifier(
    n_estimators=300,
    max_depth=25,
    min_samples_split=5,
    min_samples_leaf=2,
    class_weight='balanced',
    n_jobs=-1,
    random_state=42
)

model.fit(X_train_scaled, y_train)

# Evaluate
y_pred = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)

print(f"✅ Model training complete!")
print(f"   Test Accuracy: {accuracy*100:.2f}%")

# Classification report
print(f"\n   Classification Report:")
print(f"   " + "-" * 50)
report = classification_report(
    y_test, y_pred,
    target_names=gesture_folders,
    digits=2,
    zero_division=0
)
for line in report.split('\n'):
    print(f"   {line}")

# ============================================================================
# STEP 6: Save model and artifacts
# ============================================================================
print(f"\n[6/6] Saving model and artifacts...")

try:
    # Save model
    with open(OUTPUT_MODEL, 'wb') as f:
        pickle.dump(model, f)
    print(f"✅ Model saved: {OUTPUT_MODEL}")
    
    # Save scaler
    with open(OUTPUT_SCALER, 'wb') as f:
        pickle.dump(scaler, f)
    print(f"✅ Scaler saved: {OUTPUT_SCALER}")
    
    # Save class mapping
    with open(OUTPUT_CLASS_MAP, 'wb') as f:
        pickle.dump({'class_to_idx': class_to_idx, 'idx_to_class': idx_to_class}, f)
    print(f"✅ Class mapping saved: {OUTPUT_CLASS_MAP}")
    
except Exception as e:
    print(f"❌ ERROR saving files: {e}")
    exit(1)

# ============================================================================
# SUMMARY
# ============================================================================
print(f"\n" + "=" * 60)
print(f"✅ TRAINING COMPLETE!")
print(f"=" * 60)
print(f"Model Performance:")
print(f"  • Accuracy: {accuracy*100:.2f}%")
print(f"  • Training samples: {len(X_train)}")
print(f"  • Test samples: {len(X_test)}")
print(f"  • Gesture classes: {len(gesture_folders)} (1-9, A-Z)")
print(f"\nFiles saved:")
print(f"  • {OUTPUT_MODEL}")
print(f"  • {OUTPUT_SCALER}")
print(f"  • {OUTPUT_CLASS_MAP}")
print(f"\nNext step: Restart Flask backend to load new model")
print(f"=" * 60)
