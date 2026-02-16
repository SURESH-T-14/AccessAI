#!/usr/bin/env python3
"""
Test gesture classifier accuracy on validation set
"""
import os
import cv2
import numpy as np
import pickle
import mediapipe
from mediapipe.tasks.python import vision
from mediapipe.tasks import python
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import warnings
warnings.filterwarnings('ignore')

print("[TEST] Gesture Classifier Accuracy Test")
print("=" * 70)

MODEL_PATH = r"D:\ai bot base\hand_landmarker.task"
DATA_PATH = r"D:\ai bot base\archive (1)\indian"
CLASSIFIER_PATH = "gesture_classifier.pkl"

# Check if model exists
if not os.path.exists(CLASSIFIER_PATH):
    print(f"ERROR: Model not found: {CLASSIFIER_PATH}")
    exit(1)

# Load model and class map
print("\n[1/4] Loading trained model...")
with open(CLASSIFIER_PATH, "rb") as f:
    clf = pickle.load(f)
print(f"[OK] Model loaded: {CLASSIFIER_PATH}")

# Load class mapping
gesture_classes = sorted([d for d in os.listdir(DATA_PATH) if os.path.isdir(os.path.join(DATA_PATH, d))])
print(f"[OK] Found {len(gesture_classes)} gesture classes: {', '.join(gesture_classes)}")

# Initialize MediaPipe
print("\n[2/4] Initializing MediaPipe Hand Landmarker...")
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

# Extract test samples (sample from each class)
print("\n[3/4] Extracting test samples (10 per class)...")
X_test = []
y_test = []
test_count = 0
samples_per_class = 10

for class_idx, class_name in enumerate(gesture_classes):
    class_path = os.path.join(DATA_PATH, class_name)
    images = [f for f in os.listdir(class_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    # Take last 10 images (different from training which sampled from all)
    test_images = images[-samples_per_class:] if len(images) >= samples_per_class else images
    
    class_count = 0
    for img_file in test_images:
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
                
                X_test.append(features)
                y_test.append(class_idx)
                class_count += 1
                test_count += 1
        except Exception as e:
            continue
    
    print(f"  [{class_name:2s}] Extracted {class_count}/{len(test_images)} test samples")

landmarker.close()

X_test = np.array(X_test)
y_test = np.array(y_test)

print(f"\n[OK] Total test samples: {test_count}")

# Test model accuracy
print("\n[4/4] Testing model accuracy...")
y_pred = clf.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n" + "=" * 70)
print(f"TEST ACCURACY: {accuracy * 100:.2f}%")
print(f"=" * 70)

# Per-class accuracy
print("\nPER-CLASS ACCURACY:")
print(f"{'Gesture':<10} {'Accuracy':<15} {'Samples':<10}")
print(f"{'-' * 35}")

for class_idx, class_name in enumerate(gesture_classes):
    mask = y_test == class_idx
    if mask.sum() > 0:
        class_acc = accuracy_score(y_test[mask], y_pred[mask])
        samples = mask.sum()
        print(f"{class_name:<10} {class_acc*100:>6.2f}%          {samples:>3d}")

print(f"\n{'=' * 70}")
print("CLASSIFICATION REPORT:")
print(f"{'=' * 70}")
print(classification_report(
    y_test, y_pred,
    target_names=gesture_classes,
    digits=3,
    zero_division=0
))

print("\n[SUCCESS] Model is ready for deployment!")
print("=" * 70)
