import requests
import json

# First create a show and act
base_url = "https://showmanager.preview.emergentagent.com/api"

# Create show
show_data = {
    "title": "Debug Show",
    "date": "2025-08-15",
    "venue": "Test Venue"
}

print("Creating show...")
show_response = requests.post(f"{base_url}/shows", json=show_data)
print(f"Show creation status: {show_response.status_code}")
show_id = show_response.json()['id']
print(f"Show ID: {show_id}")

# Create act
act_data = {
    "show_id": show_id,
    "name": "Test Act",
    "duration": 10,
    "sequence_order": 1
}

print("\nCreating act...")
act_response = requests.post(f"{base_url}/acts", json=act_data)
print(f"Act creation status: {act_response.status_code}")
act_id = act_response.json()['id']
print(f"Act ID: {act_id}")

# Try to reorder
reorder_data = {
    "act_updates": [
        {"id": act_id, "sequence_order": 2}
    ]
}

print("\nTrying to reorder...")
print(f"Reorder data: {json.dumps(reorder_data, indent=2)}")
reorder_response = requests.put(f"{base_url}/acts/reorder", json=reorder_data)
print(f"Reorder status: {reorder_response.status_code}")
print(f"Reorder response: {reorder_response.text}")

# Check if act still exists
print("\nChecking if act exists...")
get_act_response = requests.get(f"{base_url}/acts/{act_id}")
print(f"Get act status: {get_act_response.status_code}")
if get_act_response.status_code == 200:
    act_data = get_act_response.json()
    print(f"Act sequence_order: {act_data.get('sequence_order')}")

# Cleanup
print("\nCleaning up...")
requests.delete(f"{base_url}/acts/{act_id}")
requests.delete(f"{base_url}/shows/{show_id}")
print("Cleanup complete")