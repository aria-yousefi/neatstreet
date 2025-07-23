import os
import time
from ultralytics import YOLO
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "best.pt")

# Load model once
model = YOLO(MODEL_PATH)
correct_classes = {0: 'trash', 1: 'pothole'}

def classify_image(image_file):
    img = Image.open(image_file)

    print("🟡 Running YOLO detection...")
    start = time.time()
    results = model(img)
    print(f"✅ YOLO finished in {time.time() - start:.2f} seconds")
    
    result = results[0]   # get first result object
    pred_idx = int(result.boxes.cls[0])
    label = correct_classes[pred_idx] if pred_idx in correct_classes else None
    
    return label if label else None