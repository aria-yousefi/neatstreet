from flask import request, jsonify, send_from_directory, Blueprint
import pandas as pd
import os

from database import db
from database.models import Report, User
from utils.geolocate import reverse_geocode
from ml_model.classify import classify_image

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS



report_bp = Blueprint('report', __name__)

@report_bp.route('/classify', methods=['POST'])
def classify_endpoint():
    if 'image' not in request.files:
        return jsonify({'error': 'No image part'}), 400
    
    img = request.files['image']
    if img.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    try:
        issue_type = classify_image(img)
        return jsonify({'issue_type': issue_type})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@report_bp.route('/report', methods=['POST'])
def report_issue():

    if 'image' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    user_id = request.form.get('user_id')
    if not user_id:
        return jsonify({'error': 'Missing user_id'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    img = request.files['image']
    if img.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if not allowed_file(img.filename):
        return jsonify({'error': 'File type not allowed'}), 400 
        
            
    # Get lat and lon coordinates from the form data
    if (lat := request.form.get('lat')) is None or (lon := request.form.get('lon')) is None:
        return jsonify({'error': 'Error fetching coordinates'}), 400

    # Get new fields
    issue_type = request.form.get('issue_type')
    details = request.form.get('details')
    user_defined_issue_type = request.form.get('user_defined_issue_type')

    if not issue_type:
        return jsonify({'error': 'Missing issue_type'}), 400
    
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
    filename = f"{user_id}_{next_id}_{safe_issue_type}{ext}"
    filepath = os.path.join('uploads', filename)

    # Save image to uploads folder
    img.save(filepath)

    # Retrieve address of issue from coordinates
    address = reverse_geocode(lat,lon)

    # Save to DB
    report = Report(
        user_id=user_id,
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

    return jsonify(report.to_dict()), 201

@report_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory('uploads', filename)

@report_bp.route('/report/<int:report_id>', methods=['GET'])
def get_report(report_id):
    report = Report.query.get(report_id)
    if report is None:
        return jsonify({'error': 'Report not found'}), 404
    
    return jsonify(report.to_dict())


@report_bp.route('/user_reports', methods=['GET'])
def get_all_reports():
    reports = Report.query.all()
    results = [r.to_dict() for r in reports]
    return jsonify(results)

@report_bp.route('/my-reports/<int:user_id>', methods=['GET'])
def get_my_reports(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    reports = Report.query.filter_by(user_id=user_id).order_by(Report.timestamp.desc()).all()
    return jsonify([r.to_dict() for r in reports])

@report_bp.route('/report/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):
    user_id = request.json.get('user_id')
    if not user_id:
        return jsonify({'error': 'Missing user_id for authorization'}), 400

    report = Report.query.get(report_id)
    if not report:
        return jsonify({'error': 'Report not found'}), 404

    if report.user_id != int(user_id):
        return jsonify({'error': 'Unauthorized'}), 403

    try:
        os.remove(os.path.join('uploads', report.image_filename))
    except OSError as e:
        print(f"Error deleting file {report.image_filename}: {e}")

    db.session.delete(report)
    db.session.commit()
    
    return jsonify({'message': 'Report deleted successfully'}), 200
