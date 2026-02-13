from flask import request, jsonify, send_from_directory, Blueprint
import os
import uuid
from datetime import datetime

from database import db
from database.models import Report, User, ScrapedReport
from utils.geolocate import reverse_geocode
from PIL import Image as PILImage
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

    # Generate a highly unique filename to prevent frontend caching issues
    # where an old image might be shown for a new report.
    ext = os.path.splitext(img.filename)[1]
    timestamp_str = datetime.now().strftime("%Y%m%d%H%M%S")
    unique_hash = uuid.uuid4().hex[:8]
    filename = f"{user_id}_{timestamp_str}_{unique_hash}{ext}"
    filepath = os.path.join('uploads', filename)

    # --- Thumbnail Generation ---
    thumbnail_filename = f"thumb_{filename}"
    thumbnail_filepath = os.path.join('uploads', thumbnail_filename)
    with PILImage.open(img) as img_pil:
        # Create a thumbnail with a max dimension of 400px, preserving aspect ratio
        img_pil.thumbnail((400, 400))
        img_pil.save(thumbnail_filepath, "JPEG", quality=85)
    # --- End Thumbnail Generation ---

    # IMPORTANT: Reset the file stream's pointer to the beginning before saving the original.
    # Reading the stream for thumbnail generation moves the pointer to the end.
    img.seek(0)
    # Save image to uploads folder
    img.save(filepath)

    # Retrieve address of issue from coordinates
    address = reverse_geocode(lat,lon)

    # Save to DB
    report = Report(
        user_id=user_id,
        image_filename=filename,
        thumbnail_filename=thumbnail_filename,
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

@report_bp.route('/reports/search', methods=['GET'])
def search_reports():
    query_str = request.args.get('q')
    if not query_str or len(query_str) < 3:
        return jsonify([]) # Return empty for short queries instead of an error

    search_term = f"%{query_str}%"

    # Search user-submitted reports (issue type, user-defined type, and details)
    user_reports_query = Report.query.filter(
        db.or_(
            Report.issue_type.ilike(search_term),
            Report.user_defined_issue_type.ilike(search_term),
            Report.details.ilike(search_term)
        )
    )

    # Search scraped reports (issue type and details)
    scraped_reports_query = ScrapedReport.query.filter(
        db.or_(
            ScrapedReport.issue_type.ilike(search_term),
            ScrapedReport.details.ilike(search_term)
        )
    )

    # Combine and format results, adding a 'type' field for the frontend
    user_results = [r.to_dict() for r in user_reports_query.all()]
    for r in user_results:
        r['type'] = 'user'

    scraped_results = [r.to_dict() for r in scraped_reports_query.all()]
    for r in scraped_results:
        r['type'] = 'scraped'

    all_results = sorted(user_results + scraped_results, key=lambda r: r.get('timestamp') or r.get('date_created'), reverse=True)

    return jsonify(all_results[:50]) # Limit to the top 50 results

@report_bp.route('/scraped-reports/<int:report_id>', methods=['GET'])
def get_scraped_report(report_id):
    report = ScrapedReport.query.get(report_id)
    if report is None:
        return jsonify({'error': 'Scraped report not found'}), 404
    
    return jsonify(report.to_dict())


@report_bp.route('/user_reports', methods=['GET'])
def get_all_reports():
    sw_lat = request.args.get('sw_lat', type=float)
    sw_lng = request.args.get('sw_lng', type=float)
    ne_lat = request.args.get('ne_lat', type=float)
    ne_lng = request.args.get('ne_lng', type=float)
    status = request.args.get('status')

    query = Report.query

    if all([sw_lat, sw_lng, ne_lat, ne_lng]):
        query = query.filter(Report.latitude.between(sw_lat, ne_lat), Report.longitude.between(sw_lng, ne_lng))

    if status == 'open':
        # "submitted" and "in progress" are considered open.
        query = query.filter(Report.status.in_(['submitted', 'in progress']))
    elif status == 'closed':
        query = query.filter(Report.status == 'closed')

    # Add a limit for safety and consistency
    reports = query.order_by(Report.timestamp.desc()).limit(500).all()
    return jsonify([r.to_dict() for r in reports])

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

@report_bp.route('/scraped-reports', methods=['GET'])
def get_all_scraped_reports():
    """
    Fetches scraped reports. If map bounding box coordinates are provided as query
    parameters, it filters reports within that box. Otherwise, it returns the
    latest 500 reports.
    """
    sw_lat = request.args.get('sw_lat', type=float)
    sw_lng = request.args.get('sw_lng', type=float)
    ne_lat = request.args.get('ne_lat', type=float)
    ne_lng = request.args.get('ne_lng', type=float)
    status = request.args.get('status')

    query = ScrapedReport.query

    # Always filter out reports where the status is 'NotAnIssue'.
    query = query.filter(db.not_(ScrapedReport.status.ilike('NotAnIssue')))
    query = query.filter(db.not_(ScrapedReport.status.ilike('Cancelled')))

    if all([sw_lat, sw_lng, ne_lat, ne_lng]):
        query = query.filter(ScrapedReport.latitude.between(sw_lat, ne_lat), ScrapedReport.longitude.between(sw_lng, ne_lng))

    if status == 'open':
        # Use `not ilike` to find statuses that do not contain 'close' case-insensitively.
        query = query.filter(db.not_(ScrapedReport.status.ilike('%close%')))
    elif status == 'closed':
        # Use `ilike` for case-insensitive matching for 'closed'.
        query = query.filter(ScrapedReport.status.ilike('%close%'))

    reports = query.order_by(ScrapedReport.date_created.desc()).limit(500).all()
    return jsonify([r.to_dict() for r in reports])
