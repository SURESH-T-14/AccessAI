#!/usr/bin/env python3
"""
Fast Gesture Classifier Training - Optimized for Memory and Speed
Trains on sampled images from archive (1)\indian
"""
import os
import cv2
import numpy as np
import mediapipe
import random
import pickle
from mediapipe.tasks.python import vision
from mediapipe.tasks import python
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

print("[TRAINING] Fast Gesture Classifier - Optimized Training")
print("=" * 70)

MODEL_PATH = r"D:\ai bot base\hand_landmarker.task"
DATA_PATH = r"D:\ai bot base\archive (1)\indian"
OUTPUT_DIR = r"D:\ai bot base"

# Get gesture class names
class_dirs = sorted([d for d in os.listdir(DATA_PATH) if os.path.isdir(os.path.join(DATA_PATH, d))])
print(f"\nFound {len(class_dirs)} gesture classes: {', '.join(class_dirs)}")

# Initialize MediaPipe
print("\n[1/6] Initializing MediaPipe Hand Landmarker...")
base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.HandLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.IMAGE,
    min_hand_detection_confidence=0.3,
    min_hand_presence_confidence=0.3,
    min_tracking_confidence=0.3
)
landmarker = vision.HandLandmarker.create_from_options(options)
print("[OK] Hand Landmarker initialized")

# Extract landmarks - SAMPLED VERSION (faster)
print("\n[2/6] Extracting hand landmarks (sampling 50 images per class)...")

X = []
y = []
total_extracted = 0

for class_idx, class_name in enumerate(class_dirs):
    class_path = os.path.join(DATA_PATH, class_name)
    all_images = [f for f in os.listdir(class_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    # Sample 50 images per class for faster training
    sample_size = min(50, len(all_images))
    images = random.sample(all_images, sample_size)
    
    class_extracted = 0
    for img_file in images:
        img_path = os.path.join(class_path, img_file)
        try:
            image = cv2.imread(img_path)
            if image is None:
                continue
            
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mediapipe.Image(image_format=mediapipe.ImageFormat.SRGB, data=image_rgb)
            results = landmarker.detect(mp_image)
            
            if results.hand_landmarks and len(results.hand_landmarks) > 0:
                landmarks = results.hand_landmarks[0]
                features = []
                for lm in landmarks:
                    features.extend([lm.x, lm.y, lm.z])
                
                X.append(features)
                y.append(class_idx)
                total_extracted += 1
                class_extracted += 1
        except Exception as e:
            continue
    
    print(f"  [{class_name:2s}] {class_extracted:3d} / {sample_size:3d}")

landmarker.close()

X = np.array(X)
y = np.array(y)

print(f"\n[OK] Extracted {total_extracted} landmark sets")
print(f"Feature matrix shape: {X.shape}")
print(f"Classes: {len(np.unique(y))}")

# Train-test split
print("\n[3/6] Splitting data (80/20)...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"[OK] Train: {len(X_train)}, Test: {len(X_test)}")

# Normalize
print("\n[4/6] Normalizing features...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
print("[OK] Features normalized")

# Train model
print("\n[5/6] Training RandomForest classifier...")
clf = RandomForestClassifier(
    n_estimators=200,
    max_depth=20,
    min_samples_split=5,
    min_samples_leaf=2,
    max_features='sqrt',
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
clf.fit(X_train_scaled, y_train)
print("[OK] Model trained")

# Evaluate
print("\n[6/6] Evaluating model...")
y_pred = clf.predict(X_test_scaled)
test_acc = accuracy_score(y_test, y_pred)

print(f"\n{'='*70}")
print(f"TEST ACCURACY: {test_acc*100:.2f}%")
print(f"{'='*70}")

print("\nPER-CLASS ACCURACY:")
for class_idx, class_name in enumerate(class_dirs):
    mask = y_test == class_idx
    if mask.sum() > 0:
        class_acc = accuracy_score(y_test[mask], y_pred[mask])
        print(f"  {class_name}: {class_acc*100:6.2f}%")

# Save model
print("\n[SAVING] Saving model files...")
model_path = os.path.join(OUTPUT_DIR, "gesture_classifier.pkl")
with open(model_path, 'wb') as f:
    pickle.dump(clf, f)
print(f"[OK] Model: {model_path}")

scaler_path = os.path.join(OUTPUT_DIR, "gesture_scaler.pkl")
with open(scaler_path, 'wb') as f:
    pickle.dump(scaler, f)
print(f"[OK] Scaler: {scaler_path}")

class_map = {i: name for i, name in enumerate(class_dirs)}
class_map_path = os.path.join(OUTPUT_DIR, "gesture_class_map.pkl")
with open(class_map_path, 'wb') as f:
    pickle.dump(class_map, f)
print(f"[OK] Class map: {class_map_path}")

print(f"\n{'='*70}")
print(f"[SUCCESS] Training complete! Model ready for deployment.")
print(f"{'='*70}")
print(f"Accuracy: {test_acc*100:.2f}%")
print(f"Restart Flask backend to load new model.")
print(f"{'='*70}")
