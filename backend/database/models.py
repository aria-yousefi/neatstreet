from datetime import datetime, timezone
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
    thumbnail_filename = db.Column(db.String(120), nullable=True)
    issue_type = db.Column(db.String(50), nullable=False)
    user_defined_issue_type = db.Column(db.String(100), nullable=True) # New field
    details = db.Column(db.String(500), nullable=True) # New field
    address = db.Column(db.String(200), nullable=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='submitted')
    timestamp = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        timestamp_iso = None
        if self.timestamp:
            # If the datetime object is "naive" (has no timezone info),
            # assume it's in the server's local timezone and convert it to an aware object.
            if self.timestamp.tzinfo is None:
                dt_aware = self.timestamp.astimezone()
            else:
                dt_aware = self.timestamp
            # Now convert to UTC and format as ISO 8601, replacing +00:00 with Z for max compatibility
            timestamp_iso = dt_aware.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')

        return {
            'id': self.id,
            'user_id': self.user_id,
            'thumbnail_url': f"http://localhost:5000/uploads/{self.thumbnail_filename}" if self.thumbnail_filename else None,
            'image_url': f"http://localhost:5000/uploads/{self.image_filename}",
            'issue_type': self.issue_type,
            'user_defined_issue_type': self.user_defined_issue_type,
            'details': self.details,
            'address': self.address,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'status': self.status,
            'timestamp': timestamp_iso,
        }

# Define ScrapedReport Model for external data
class ScrapedReport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    source = db.Column(db.String(50), nullable=False, default='Gainesville_311')
    source_id = db.Column(db.BigInteger, unique=True, nullable=False)
    issue_type = db.Column(db.String(200), nullable=False)
    date_created = db.Column(db.DateTime, nullable=False)
    address = db.Column(db.String(255))
    details = db.Column(db.Text)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    status = db.Column(db.String(50))
    image_url = db.Column(db.String(500), nullable=True)

    def to_dict(self):
        date_created_iso = None
        if self.date_created:
            # If the datetime object is "naive" (has no timezone info),
            # assume it's in the server's local timezone and convert it to an aware object.
            if self.date_created.tzinfo is None:
                dt_aware = self.date_created.astimezone()
            else:
                dt_aware = self.date_created
            # Now convert to UTC and format as ISO 8601, replacing +00:00 with Z for max compatibility
            date_created_iso = dt_aware.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')

        return {
            'id': self.id,
            'source_id': self.source_id,
            'source': self.source,
            'issue_type': self.issue_type,
            'date_created': date_created_iso,
            'address': self.address,
            'details': self.details,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'status': self.status,
            'image_url': self.image_url,
        }
