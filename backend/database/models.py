from datetime import datetime
from . import db

# Define User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

# Define Report Model
class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('reports', lazy=True))
    image_filename = db.Column(db.String(120), nullable=False)
    issue_type = db.Column(db.String(50), nullable=False)
    user_defined_issue_type = db.Column(db.String(100), nullable=True) # New field
    details = db.Column(db.String(500), nullable=True) # New field
    address = db.Column(db.String(200), nullable=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'image_filename': self.image_filename,
            'image_url': f"http://localhost:5000/uploads/{self.image_filename}",
            'issue_type': self.issue_type,
            'user_defined_issue_type': self.user_defined_issue_type,
            'details': self.details,
            'address': self.address,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'timestamp': self.timestamp.isoformat(),
        }
