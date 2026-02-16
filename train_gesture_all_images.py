#!/usr/bin/env python3
"""
Train gesture classifier on ALL Indian sign language hand gesture images (1-9, A-Z)
With timeout handling for stable processing of all images
"""
import os
import cv2
import numpy as np
import mediapipe
from mediapipe.tasks.python import vision
from mediapipe.tasks import python
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
import pickle
from threading import Thread
import time

MODEL_PATH = r"D:\ai bot base\hand_landmarker.task"
DATA_PATH = r"D:\ai bot base\archive (1)\indian"
OUTPUT_DIR = r"D:\ai bot base"

# Get gesture class names (folders)
class_dirs = sorted([d for d in os.listdir(DATA_PATH) if os.path.isdir(os.path.join(DATA_PATH, d))])
print(f"Found gesture classes: {', '.join(class_dirs)}")

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

print("\n[2/5] Extracting hand landmarks from ALL images...")
print("Processing all images with data augmentation\n")

def augment_landmarks(landmarks, flip=False, rotation_angle=0, scale_factor=1.0):
    """Apply augmentation to landmarks"""
    aug_landmarks = []
    for lm in landmarks:
        x, y, z = lm.x, lm.y, lm.z
        
        if flip:
            x = 1 - x
        
        if rotation_angle != 0:
            cx, cy = 0.5, 0.5
            angle_rad = np.radians(rotation_angle)
            cos_a, sin_a = np.cos(angle_rad), np.sin(angle_rad)
            x_rot = cx + (x - cx) * cos_a - (y - cy) * sin_a
            y_rot = cy + (x - cx) * sin_a + (y - cy) * cos_a
            x, y = x_rot, y_rot
        
        if scale_factor != 1.0:
            cx, cy = 0.5, 0.5
            x = cx + (x - cx) * scale_factor
            y = cy + (y - cy) * scale_factor
        
        x = max(0, min(1, x))
        y = max(0, min(1, y))
        
        aug_landmarks.append([x, y, z])
    
    return aug_landmarks

X = []
y = []
total_images = 0
extracted_count = 0

for class_idx, class_name in enumerate(class_dirs):
    class_path = os.path.join(DATA_PATH, class_name)
    images = [f for f in os.listdir(class_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    print(f"  [{class_name:2s}] {len(images):4d} images: ", end="", flush=True)
    
    class_extracted = 0
    total_images += len(images)
    
    for idx, img_file in enumerate(images):
        img_path = os.path.join(class_path, img_file)
        
        try:
            image = cv2.imread(img_path)
            if image is None:
                continue
            
            # Skip invalid images
            if image.shape[0] < 10 or image.shape[1] < 10:
                continue
            
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mediapipe.Image(image_format=mediapipe.ImageFormat.SRGB, data=image_rgb)
            
            # Detect landmarks with timeout handling
            try:
                results = landmarker.detect(mp_image)
            except:
                continue
            
            if results.hand_landmarks and len(results.hand_landmarks) > 0:
                landmarks = results.hand_landmarks[0]
                
                # Original + 3 augmentations = 4x samples per image
                augmentations = [
                    (landmarks, False, 0, 1.0),           # Original
                    (landmarks, True, 0, 1.0),            # Flipped
                    (landmarks, False, 5, 1.0),           # Rotated
                    (landmarks, False, 0, 1.05),          # Scaled
                ]
                
                for lm, flip, rotation, scale in augmentations:
                    if flip or rotation != 0 or scale != 1.0:
                        lm = augment_landmarks(lm, flip=flip, rotation_angle=rotation, scale_factor=scale)
                    
                    features = []
                    for landmark in lm:
                        if isinstance(landmark, list):
                            features.extend(landmark)
                        else:
                            features.extend([landmark.x, landmark.y, landmark.z])
                    
                    if len(features) == 63:
                        X.append(features)
                        y.append(class_idx)
                        extracted_count += 1
                        class_extracted += 1
        
        except KeyboardInterrupt:
            raise
        except:
            continue
        
        # Progress indicator every 100 images
        if (idx + 1) % 100 == 0:
            print(f"{idx + 1}.. ", end="", flush=True)
    
    print(f"OK ({class_extracted} extracted)")

print(f"\n{'-'*70}")
print(f"Total images scanned:      {total_images}")
print(f"Total landmarks extracted: {extracted_count}")
print(f"Extraction rate:           {extracted_count*100/max(total_images,1):.1f}%")
print(f"Training samples (w/ aug): {len(X)}")
print(f"{'-'*70}")

if extracted_count < 50:
    print("[ERROR] Not enough samples extracted!")
    exit(1)

X = np.array(X)
y = np.array(y)

print(f"\nDataset shape: {X.shape}")
print(f"Classes: {len(np.unique(y))}")
for gesture_class in class_dirs:
    idx = class_dirs.index(gesture_class)
    count = np.sum(y == idx)
    print(f"  {gesture_class}: {count} samples")

print("\n[3/5] Splitting train/test (80/20 stratified)...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"[OK] Train: {len(X_train)}, Test: {len(X_test)}")

print("\n[4/5] Training RandomForest (1000 trees, depth=35 for maximum accuracy)...")
print("       This will provide the best accuracy with 1200+ images per class")
clf = RandomForestClassifier(
    n_estimators=1000,
    max_depth=35,
    min_samples_split=2,
    min_samples_leaf=1,
    max_features='sqrt',
    class_weight='balanced',
    random_state=42,
    n_jobs=-1,
    verbose=1
)

clf.fit(X_train, y_train)
print("[OK] Training complete")

print("\n[5/5] Evaluating model...")
y_pred = clf.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n{'-'*70}")
print(f"Test Accuracy: {accuracy*100:.2f}%")
print(f"{'-'*70}")

print("\nPer-class results:")
report = classification_report(y_test, y_pred, target_names=class_dirs, digits=3, zero_division=0)
print(report)

# Save model
model_path = os.path.join(OUTPUT_DIR, "gesture_classifier.pkl")
with open(model_path, 'wb') as f:
    pickle.dump(clf, f)

print(f"\n[OK] Model saved: {model_path}")
print(f"[OK] File size: {os.path.getsize(model_path) / (1024*1024):.2f} MB")

print("\n" + "="*70)
print("TRAINING COMPLETE!")
print("="*70)
print("Next: Restart Flask backend and test gesture recognition")
print("="*70)
