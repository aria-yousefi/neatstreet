import os
import time
from ultralytics import YOLO
from PIL import Image
import io

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "best.pt")

# Load model once
model = YOLO(MODEL_PATH)
correct_classes = {0: 'trash', 1: 'pothole'}

def classify_image(image_file):
        # image_file is a Flask FileStorage
    image_file.stream.seek(0)        # ensure pointer at start
    img_bytes = image_file.read()    # read bytes
    image_file.stream.seek(0)        # reset so caller can reuse (save etc.)

    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    print("🟡 Running YOLO detection...")
    start = time.time()
    results = model(img)
    print(f"✅ YOLO finished in {time.time() - start:.2f} seconds")
    
    result = results[0]   # get first result object
    pred_idx = int(result.boxes.cls[0]) if result.boxes else None
    label = correct_classes[pred_idx] if pred_idx in correct_classes else None
    
    return label if label else None