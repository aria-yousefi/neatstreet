from flask import Flask
from flask_cors import CORS 
from database import init_db, db
from routes.report_routes import report_bp
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

CORS(app)
init_db(app)

app.register_blueprint(report_bp)
# app.register_blueprint(auth_bp)

if __name__ == '__main__':
    app.run(threaded=True)