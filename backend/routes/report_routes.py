from flask import request, jsonify, send_from_directory, Blueprint
import pandas as pd
import os

from database import db
from database.models import Report
from utils.geolocate import reverse_geocode
from ml_model.classify import classify_image

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS



report_bp = Blueprint('report', __name__)


@report_bp.route('/report', methods=['POST'])
def report_issue():

    if 'image' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    img = request.files['image']
    if img.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if not allowed_file(img.filename):
        return jsonify({'error': 'File type not allowed'}), 400 
        
            
    # Get lat and lon coordinates from the form data
    if (lat := request.form.get('lat')) is None or (lon := request.form.get('lon')) is None:
        return jsonify({'error': 'Error fetching coordinates'}), 400

    # Get new fields
    details = request.form.get('details')
    user_defined_issue_type = request.form.get('user_defined_issue_type')

    img.stream.seek(0, os.SEEK_END)
    size = img.stream.tell()
    img.stream.seek(0)
    print("UPLOAD size bytes:", size, "filename:", img.filename, "content_type:", img.content_type)

    # Classify the issue using YOLOv8
    issue_type = classify_image(img)

    # If model can't detect known classes, accept the report anyway
    if not issue_type:
        issue_type = "other"   # or "unknown"
    
    # Conditional validation for 'other' issue type
    if issue_type == "other" and not user_defined_issue_type:
        return jsonify({'error': 'User-defined issue type is required when issue type is "other"'}), 400

    # Reset file pointer to the beginning
    img.seek(0)  
    
    # Get the next ID safely
    last_report = db.session.query(Report).order_by(Report.id.desc()).first()
    next_id = (last_report.id + 1) if last_report else 1

    # Generate filename
    ext = os.path.splitext(img.filename)[1]
    safe_issue_type = issue_type.replace(" ", "_").lower()
    filename = f"{next_id}_{safe_issue_type}{ext}"
    filepath = os.path.join('uploads', filename)

    # Save image to uploads folder
    img.save(filepath)

    # Retrieve address of issue from coordinates
    address = reverse_geocode(lat,lon)

    # Save to DB
    report = Report(
        image_filename=filename,
        issue_type=issue_type,
        user_defined_issue_type=user_defined_issue_type, # New field
        details=details, # New field
        address=address,
        latitude=float(lat),
        longitude=float(lon)
    )
    db.session.add(report)
    db.session.commit()

    return(get_report(report.id))

@report_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory('uploads', filename)

@report_bp.route('/report/<int:report_id>', methods=['GET'])
def get_report(report_id):
    report = Report.query.get(report_id)
    if report is None:
        return jsonify({'error': 'Report not found'}), 404
    
    result = {
        'id': report.id,
        'image_url': f"http://localhost:5000/uploads/{report.image_filename}",
        'issue_type': report.issue_type,
        'user_defined_issue_type': report.user_defined_issue_type, # New field
        'details': report.details, # New field
        'address': report.address,
        'latitude': report.latitude,
        'longitude': report.longitude,
        'timestamp': report.timestamp.isoformat(),
    }
    return jsonify(result)


@report_bp.route('/user_reports', methods=['GET'])
def get_all_reports():
    reports = Report.query.all()
    results = [
        {
            'id': report.id,
            'image_filename': report.image_filename,
            'image_url': f"http://localhost:5000/uploads/{report.image_filename}",
            'issue_type': report.issue_type,
            'user_defined_issue_type': report.user_defined_issue_type, # New field
            'details': report.details, # New field
            'address': report.address,
            'latitude': report.latitude,
            'longitude': report.longitude,
            'timestamp': report.timestamp.isoformat(),
        }
        for report in reports
    ]
    return jsonify(results)
