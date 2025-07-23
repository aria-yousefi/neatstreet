from flask import Flask, request, jsonify, Blueprint
from flask_jwt_extended import (
    JWTManager, create_access_token, 
    jwt_required, get_jwt_identity 
    )
from database.models import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    # Save hashed password & username to DB here
    return jsonify(msg="User registered"), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    username = request.json.get('username')
    password = request.json.get('password')
    user = User.query.filter_by(username=username).first()
    if username != 'test' or password != 'test':
        return jsonify({"msg":"Bad username or password"}), 401

    access_token = create_access_token(identity=username)
    return jsonify(access_token=access_token)

@auth_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    user = get_jwt_identity()
    return jsonify(user=user)
