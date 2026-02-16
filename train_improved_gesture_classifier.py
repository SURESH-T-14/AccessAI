#!/usr/bin/env python3
"""
Train improved gesture classifier on hand gesture images (1-9, A-Z)
OPTIMIZED VERSION: Samples images to speed up training while maintaining accuracy
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

MODEL_PATH = r"D:\ai bot base\hand_landmarker.task"
# Try archive first, then archive (1)
DATA_PATH = None
if os.path.exists(r"D:\ai bot base\archive\indian"):
    DATA_PATH = r"D:\ai bot base\archive\indian"
elif os.path.exists(r"D:\ai bot base\archive (1)\indian"):
    DATA_PATH = r"D:\ai bot base\archive (1)\indian"

OUTPUT_DIR = r"D:\ai bot base"

if DATA_PATH is None:
    print("[ERROR] Training data not found!")
    print("Looking for: D:\\ai bot base\\archive\\indian or archive (1)\\indian")
    print("Please ensure training data exists before running this script.")
    sys.exit(1)

print(f"[✓] Training data found at: {DATA_PATH}")

# Get gesture class names (folders)
class_dirs = sorted([d for d in os.listdir(DATA_PATH) if os.path.isdir(os.path.join(DATA_PATH, d))])
print(f"Found gesture classes: {', '.join(class_dirs)}")

if len(class_dirs) == 0:
    print("[ERROR] No gesture folders found in training data!")
    sys.exit(1)

print("\n[1/5] Initializing MediaPipe Hand Landmarker...")
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

print("\n[2/5] Extracting hand landmarks from images (SAMPLED)...")
print("Sampling up to 50 images per gesture for speed\n")

def augment_landmarks(landmarks, flip=False, rotation_angle=0, scale_factor=1.0):
    """Apply augmentation to landmarks"""
    aug_landmarks = []
    for lm in landmarks:
        x, y, z = lm.x, lm.y, lm.z
        
        # Flip horizontally
        if flip:
            x = 1 - x
        
        # Rotate around center
        if rotation_angle != 0:
            cx, cy = 0.5, 0.5
            angle_rad = np.radians(rotation_angle)
            cos_a, sin_a = np.cos(angle_rad), np.sin(angle_rad)
            x_rot = cx + (x - cx) * cos_a - (y - cy) * sin_a
            y_rot = cy + (x - cx) * sin_a + (y - cy) * cos_a
            x, y = x_rot, y_rot
        
        # Scale
        if scale_factor != 1.0:
            cx, cy = 0.5, 0.5
            x = cx + (x - cx) * scale_factor
            y = cy + (y - cy) * scale_factor
        
        # Clamp to [0, 1]
        x = max(0, min(1, x))
        y = max(0, min(1, y))
        
        aug_landmarks.append([x, y, z])
    
    return aug_landmarks

X = []
y = []
total_images = 0
extracted_count = 0
augmented_count = 0

for class_idx, class_name in enumerate(class_dirs):
    class_path = os.path.join(DATA_PATH, class_name)
    all_images = [f for f in os.listdir(class_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    # Sample images if there are too many
    MAX_IMAGES_PER_CLASS = 50  # Sample limit per class
    if len(all_images) > MAX_IMAGES_PER_CLASS:
        images = random.sample(all_images, MAX_IMAGES_PER_CLASS)
        print(f"  [{class_name:2s}] {len(all_images):4d} images (sampling {MAX_IMAGES_PER_CLASS})", end=" -> ")
    else:
        images = all_images
        print(f"  [{class_name:2s}] {len(all_images):4d} images", end=" -> ")
    
    class_extracted = 0
    for img_file in images:
        img_path = os.path.join(class_path, img_file)
        total_images += 1
        try:
            image = cv2.imread(img_path)
            if image is None:
                continue
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mediapipe.Image(image_format=mediapipe.ImageFormat.SRGB, data=image_rgb)
            results = landmarker.detect(mp_image)
            
            if results.hand_landmarks and len(results.hand_landmarks) > 0:
                landmarks = results.hand_landmarks[0]
                
                # Original features
                features = []
                for lm in landmarks:
                    features.extend([lm.x, lm.y, lm.z])
                X.append(features)
                y.append(class_idx)
                extracted_count += 1
                class_extracted += 1
                
                # Data augmentation: add flipped version
                aug_lm = augment_landmarks(landmarks, flip=True)
                features_aug = []
                for lm in aug_lm:
                    features_aug.extend(lm)
                X.append(features_aug)
                y.append(class_idx)
                extracted_count += 1
                augmented_count += 1
                
                # Data augmentation: add slight rotation
                aug_lm = augment_landmarks(landmarks, rotation_angle=5)
                features_aug = []
                for lm in aug_lm:
                    features_aug.extend(lm)
                X.append(features_aug)
                y.append(class_idx)
                extracted_count += 1
                augmented_count += 1
                
                # Data augmentation: add slight scale
                aug_lm = augment_landmarks(landmarks, scale_factor=1.05)
                features_aug = []
                for lm in aug_lm:
                    features_aug.extend(lm)
                X.append(features_aug)
                y.append(class_idx)
                extracted_count += 1
                augmented_count += 1
        except Exception as e:
            continue
    
    print(f"✓ {class_extracted:3d} extracted ({class_extracted*4} with augmentation)")

landmarker.close()

print(f"\n{'─'*70}")
print(f"Total images scanned: {total_images}")
print(f"Landmarks extracted: {extracted_count} ({extracted_count*100/max(total_images,1):.1f}% extraction rate)")
print(f"Data augmentation samples: {augmented_count}")
print(f"Total training samples: {extracted_count} (1:4 ratio with augmentation)")
print(f"{'─'*70}")

if extracted_count < 50:
    print("[ERROR] Not enough samples to train!")
    sys.exit(1)

X = np.array(X)
y = np.array(y)
print(f"\nFeature matrix shape: {X.shape}")
print(f"Labels shape: {y.shape}")
print(f"Classes: {len(np.unique(y))}")
for i, label in enumerate(np.unique(y)):
    count = np.sum(y == label)
    gesture = class_dirs[int(label)]
    print(f"  Class {gesture}: {count} samples")

print("\n[3/5] Splitting train/test (80/20 stratified)...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"Training samples: {len(X_train)}")
print(f"Test samples: {len(X_test)}")

print("\n[4/5] Training RandomForest classifier...")
print("Parameters:")
print("  - n_estimators: 300")
print("  - max_depth: 25")
print("  - min_samples_split: 2")
print("  - class_weight: 'balanced'")

clf = RandomForestClassifier(
    n_estimators=300,
    max_depth=25,
    min_samples_split=2,
    min_samples_leaf=1,
    max_features='sqrt',
    class_weight='balanced',
    random_state=42,
    n_jobs=-1,
    verbose=1
)

clf.fit(X_train, y_train)
print("[OK] Model trained")

print("\n[5/5] Evaluating model...")
y_train_pred = clf.predict(X_train)
y_test_pred = clf.predict(X_test)

train_acc = accuracy_score(y_train, y_train_pred)
test_acc = accuracy_score(y_test, y_test_pred)

print(f"\n{'─'*70}")
print(f"OVERALL PERFORMANCE:")
print(f"  Training Accuracy: {train_acc*100:.2f}%")
print(f"  Test Accuracy:     {test_acc*100:.2f}%")
print(f"{'─'*70}")

print("\nPER-CLASS ACCURACY (Test Set):")
print(f"{'Gesture':<10} {'Accuracy':<15} {'Samples':<10}")
print(f"{'-'*35}")

per_class_accs = []
for class_idx, class_name in enumerate(class_dirs):
    mask = y_test == class_idx
    if mask.sum() > 0:
        class_acc = accuracy_score(y_test[mask], y_test_pred[mask])
        per_class_accs.append(class_acc)
        samples = mask.sum()
        print(f"{class_name:<10} {class_acc*100:>6.2f}%          {samples:>3d}")

print(f"{'-'*35}")
print(f"Average:   {np.mean(per_class_accs)*100:>6.2f}%")

print("\n" + "="*70)
print("CLASSIFICATION REPORT:")
print("="*70)
print(classification_report(
    y_test, y_test_pred,
    target_names=class_dirs,
    digits=3
))

# Get feature importance
feature_importance = clf.feature_importances_
top_features = np.argsort(feature_importance)[-10:]
print(f"\nTop 10 Important Features:")
for i, feat_idx in enumerate(top_features[::-1], 1):
    landmark_idx = feat_idx // 3
    coord = ['X', 'Y', 'Z'][feat_idx % 3]
    importance = feature_importance[feat_idx]
    print(f"  {i}. Landmark {landmark_idx} ({coord}): {importance:.4f}")

# Save model
model_path = os.path.join(OUTPUT_DIR, "gesture_classifier.pkl")
with open(model_path, 'wb') as f:
    pickle.dump(clf, f)
print(f"\n[✓] Model saved to: {model_path}")
print(f"    File size: {os.path.getsize(model_path) / (1024*1024):.2f} MB")

# Also save class mapping for reference
class_map_path = os.path.join(OUTPUT_DIR, "gesture_class_map.pkl")
with open(class_map_path, 'wb') as f:
    pickle.dump(class_dirs, f)
print(f"[✓] Class mapping saved to: {class_map_path}")

print(f"\n{'='*70}")
print("✅ TRAINING COMPLETE!")
print("="*70)
print("NEXT STEPS:")
print("1. Restart gesture_api_server_simple.py to load the new model")
print("2. Test hand gestures 1-9 and A-Z in the browser")
print("3. Monitor Flask terminal for detection results")
print("="*70)
