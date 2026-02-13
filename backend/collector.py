import click
import requests
import json
import re
import uuid
from datetime import datetime, timedelta
from flask.cli import with_appcontext
from database import db
from database.models import ScrapedReport

# Data derived from the cURL command
API_URL = 'https://gainesvillefl.citysourced.com/pages/ajax/callapiendpoint.ashx'
BASE_URL = 'https://gainesvillefl.citysourced.com/servicerequests/nearby'
HEADERS = {
    'accept': 'application/json, text/javascript, */*; q=0.01',
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    # Adding all headers from the successful cURL command to appear as a real browser.
    'accept-language': 'en-US,en;q=0.9',
    'origin': 'https://gainesvillefl.citysourced.com',
    'priority': 'u=1, i',
    'referer': BASE_URL,
    'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    'x-requested-with': 'XMLHttpRequest',
}

def parse_date(date_string):
    """Parses multiple possible date formats from the API."""
    if not date_string:
        return None
    
    # Handle .NET JSON date format: /Date(1707753341000-0500)/
    if isinstance(date_string, str) and date_string.startswith('/Date('):
        try:
            # Use regex to safely extract the timestamp, which might be negative.
            match = re.search(r'\((\-?\d+)', date_string)
            if match:
                timestamp_ms = int(match.group(1))
                return datetime.fromtimestamp(timestamp_ms / 1000.0)
        except (IndexError, ValueError):
            pass  # Fall through to the next format

    if isinstance(date_string, str):
        # Normalize ISO-like strings with non-standard fractional seconds
        # e.g., '2025-11-26T15:36:52.6945979Z' or '...:33.62'
        # This regex captures the main datetime, fractional seconds, and timezone suffix
        match = re.match(r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d+)(.*)', date_string)
        if match:
            main_part, fractional_part, tz_part = match.groups()
            # Pad or truncate fractional part to 6 digits (microseconds)
            fractional_part = (fractional_part + '000000')[:6]
            # Reassemble the string, preserving the timezone part
            date_string = f"{main_part}.{fractional_part}{tz_part}"

    try:
        return datetime.fromisoformat(date_string)
    except (ValueError, TypeError):
        return None

@click.command('scrape-gainesville')
@with_appcontext
def scrape_gainesville_command():
    """Fetches service request data from Gainesville's 311 system and saves it to the database."""
    print("Starting to scrape Gainesville 311 data...")

    with requests.Session() as session:
        # Step 1: Visit the page to get a valid session and CSRF token.
        try:
            print("Initializing session to get a fresh CSRF token...")
            response = session.get(BASE_URL, headers={'user-agent': HEADERS['user-agent']})
            response.raise_for_status()

            csrf_token = session.cookies.get('CsCsrfToken_USA')
            if not csrf_token:
                print("Error: Could not retrieve CSRF token. Aborting.")
                return
            print(f"Successfully retrieved CSRF token: {csrf_token[:10]}...")
        except requests.exceptions.RequestException as e:
            print(f"Error initializing session: {e}")
            return

        # The uniqueid must be consistent between the cookie and the payload,
        # mirroring the behavior of the successful cURL command.
        unique_id = uuid.uuid4().hex
        session.cookies.set('CsHtml5DeviceUniqueIdv2_USA', unique_id, domain='gainesvillefl.citysourced.com')
        # The cURL command also includes a locale cookie, which may be required.
        session.cookies.set('csLocaleType', 'EN', domain='gainesvillefl.citysourced.com')

        # To mimic the cURL command as closely as possible, we will build the
        # raw data string manually instead of letting `requests` build it from a dict.
        # This ensures the URL encoding matches the known-good request.
        json_payload = {
            # Define the date range from January 2025 to today
            # Define the date range from the start of the previous year to today.
            "DateFrom": f"/Date({int(datetime(datetime.now().year - 1, 1, 1).timestamp() * 1000)})/",
            "DateTo": f"/Date({int(datetime.now().timestamp() * 1000)})/",
            # Location seems to be required for this API.
            "Location": {"X": -82.325002, "Y": 29.651964},
            # Adding a radius to define a search area.
            "Radius": 20000, # 20km
            # It's good practice to include pagination. Let's fetch up to 1000.
            "Page": 1,
            "PageSize": 1000
        }
        json_payload_str = json.dumps(json_payload)

        # Manually build the application/x-www-form-urlencoded string
        from urllib.parse import quote
        raw_data = (
            f"uniqueid={unique_id}&verb=Get&endpoint=servicerequests"
            f"&json={quote(json_payload_str)}&token={csrf_token}"
        )

        # Step 2: Make the API call using the session, which includes the necessary cookies.
        try:
            response = session.post(API_URL, headers=HEADERS, data=raw_data.encode('utf-8'))
            response.raise_for_status()
            data = response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching data: {e}")
            return

    try:
        if 'd' in data and isinstance(data.get('d'), str):
            inner_data = json.loads(data['d'])
        else:
            inner_data = data

        if isinstance(inner_data, dict) and 'Results' in inner_data and isinstance(inner_data['Results'], list):
            reports = inner_data['Results']
        else:
            print("Could not find a 'Results' key containing a list in the API response.")
            print("Full API response:", inner_data)
            return
    except (TypeError, json.JSONDecodeError) as e:
        print(f"Failed to parse JSON for this chunk: {e}")
        return

    print(f"Found {len(reports)} reports from the API.")
    new_reports_count = 0
    skipped_existing_count = 0
    skipped_date_count = 0

    for report_data in reports:
        source_id = report_data.get('Id')
        if not source_id:
            continue

        if ScrapedReport.query.filter_by(source_id=source_id).first():
            skipped_existing_count += 1
            continue

        date_created = parse_date(report_data.get('DateCreated'))
        if not date_created:
            print(f"Skipping report {source_id} due to invalid date: {report_data.get('DateCreated')}")
            skipped_date_count += 1
            continue

        new_report = ScrapedReport(
            source_id=source_id,
            issue_type=report_data.get('RequestType', 'Unknown'),
            date_created=date_created,
            address=report_data.get('FormattedAddress', 'No Address Provided'),
            details=report_data.get('Description'),
            latitude=report_data.get('Latitude'),
            longitude=report_data.get('Longitude'),
            status=report_data.get('StatusType'),
            image_url=report_data.get('OriginalImageUrl')
        )
        db.session.add(new_report)
        new_reports_count += 1

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error saving to database: {e}")
        return # Exit if commit fails

    print("\nScraping summary:")
    print(f"  - Successfully added {new_reports_count} new reports to the database.")
    print(f"  - Skipped {skipped_existing_count} reports that were already in the database.")
    print(f"  - Skipped {skipped_date_count} reports due to an unparsable date format.")
def register_collector(app):
    app.cli.add_command(scrape_gainesville_command)