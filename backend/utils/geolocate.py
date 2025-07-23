import requests

def reverse_geocode(lat, lon):
    url = 'https://nominatim.openstreetmap.org/reverse'
    params = {
        'lat': lat,
        'lon': lon,
        'format': 'json'
    }
    headers = {
        'User-Agent': '311SimplifierApp/0.1 (311-application)'
    }

    response = requests.get(url, params=params, headers=headers)
    print(f"Request URL: {response.url}")  # Debugging line to check the request URL
    response.raise_for_status()  

    data = response.json()
    return data.get('display_name', 'Address not found')