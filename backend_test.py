import requests
import sys
import json
from datetime import datetime

class CircusAPITester:
    def __init__(self, base_url="https://showmanager.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_show_id = None
        self.created_act_id = None
        self.created_expense_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and 'id' in response_data:
                        print(f"   Created ID: {response_data['id']}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_create_show(self):
        """Test creating a new show"""
        show_data = {
            "title": "Test Circus Spectacular",
            "date": "2025-08-15",
            "venue": "Madison Square Garden",
            "description": "A spectacular circus show for testing"
        }
        
        success, response = self.run_test(
            "Create Show",
            "POST",
            "shows",
            200,
            data=show_data
        )
        
        if success and 'id' in response:
            self.created_show_id = response['id']
            print(f"   Show created with ID: {self.created_show_id}")
        
        return success

    def test_get_shows(self):
        """Test getting all shows"""
        success, response = self.run_test(
            "Get All Shows",
            "GET",
            "shows",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} shows")
        
        return success

    def test_get_show_by_id(self):
        """Test getting a specific show by ID"""
        if not self.created_show_id:
            print("❌ Skipping - No show ID available")
            return False
            
        success, response = self.run_test(
            "Get Show by ID",
            "GET",
            f"shows/{self.created_show_id}",
            200
        )
        
        if success and response.get('title') == "Test Circus Spectacular":
            print("   Show data matches expected values")
        
        return success

    def test_update_show(self):
        """Test updating a show"""
        if not self.created_show_id:
            print("❌ Skipping - No show ID available")
            return False
            
        update_data = {
            "title": "Updated Circus Spectacular",
            "venue": "Updated Venue"
        }
        
        success, response = self.run_test(
            "Update Show",
            "PUT",
            f"shows/{self.created_show_id}",
            200,
            data=update_data
        )
        
        return success

    def test_create_act(self):
        """Test creating a circus act"""
        if not self.created_show_id:
            print("❌ Skipping - No show ID available")
            return False
            
        act_data = {
            "show_id": self.created_show_id,
            "name": "Aerial Silks Performance",
            "performers": "Sarah Johnson, Mike Chen",
            "duration": 15,
            "sequence_order": 1,
            "description": "Breathtaking aerial silks routine",
            "staging_notes": "Requires 20ft ceiling height",
            "sound_requirements": "Classical music, wireless mic",
            "lighting_requirements": "Blue spotlight, fog machine"
        }
        
        success, response = self.run_test(
            "Create Circus Act",
            "POST",
            "acts",
            200,
            data=act_data
        )
        
        if success and 'id' in response:
            self.created_act_id = response['id']
            print(f"   Act created with ID: {self.created_act_id}")
        
        return success

    def test_get_acts_by_show(self):
        """Test getting acts for a specific show"""
        if not self.created_show_id:
            print("❌ Skipping - No show ID available")
            return False
            
        success, response = self.run_test(
            "Get Acts by Show",
            "GET",
            f"acts/show/{self.created_show_id}",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} acts for the show")
        
        return success

    def test_get_act_by_id(self):
        """Test getting a specific act by ID"""
        if not self.created_act_id:
            print("❌ Skipping - No act ID available")
            return False
            
        success, response = self.run_test(
            "Get Act by ID",
            "GET",
            f"acts/{self.created_act_id}",
            200
        )
        
        return success

    def test_update_act(self):
        """Test updating an act"""
        if not self.created_act_id:
            print("❌ Skipping - No act ID available")
            return False
            
        update_data = {
            "name": "Updated Aerial Silks Performance",
            "duration": 20
        }
        
        success, response = self.run_test(
            "Update Act",
            "PUT",
            f"acts/{self.created_act_id}",
            200,
            data=update_data
        )
        
        return success

    def test_reorder_acts(self):
        """Test reordering acts"""
        if not self.created_act_id:
            print("❌ Skipping - No act ID available")
            return False
            
        reorder_data = {
            "act_updates": [
                {"id": self.created_act_id, "sequence_order": 2}
            ]
        }
        
        success, response = self.run_test(
            "Reorder Acts",
            "PUT",
            "acts/reorder",
            200,
            data=reorder_data
        )
        
        return success

    def test_create_expense(self):
        """Test creating an expense"""
        if not self.created_show_id:
            print("❌ Skipping - No show ID available")
            return False
            
        expense_data = {
            "show_id": self.created_show_id,
            "act_id": self.created_act_id,
            "category": "performer_fee",
            "amount": 500.00,
            "description": "Payment for aerial silks performer",
            "date": "2025-08-10"
        }
        
        success, response = self.run_test(
            "Create Expense",
            "POST",
            "expenses",
            200,
            data=expense_data
        )
        
        if success and 'id' in response:
            self.created_expense_id = response['id']
            print(f"   Expense created with ID: {self.created_expense_id}")
        
        return success

    def test_get_expenses_by_show(self):
        """Test getting expenses for a specific show"""
        if not self.created_show_id:
            print("❌ Skipping - No show ID available")
            return False
            
        success, response = self.run_test(
            "Get Expenses by Show",
            "GET",
            f"expenses/show/{self.created_show_id}",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} expenses for the show")
        
        return success

    def test_error_handling(self):
        """Test error handling for invalid requests"""
        print("\n🔍 Testing Error Handling...")
        
        # Test getting non-existent show
        success1, _ = self.run_test(
            "Get Non-existent Show",
            "GET",
            "shows/invalid-id",
            404
        )
        
        # Test creating act with invalid show_id
        invalid_act_data = {
            "show_id": "invalid-show-id",
            "name": "Test Act",
            "duration": 10,
            "sequence_order": 1
        }
        
        success2, _ = self.run_test(
            "Create Act with Invalid Show ID",
            "POST",
            "acts",
            404,
            data=invalid_act_data
        )
        
        # Test creating expense with invalid show_id
        invalid_expense_data = {
            "show_id": "invalid-show-id",
            "category": "equipment",
            "amount": 100.00,
            "description": "Test expense"
        }
        
        success3, _ = self.run_test(
            "Create Expense with Invalid Show ID",
            "POST",
            "expenses",
            404,
            data=invalid_expense_data
        )
        
        return success1 and success2 and success3

    def test_cleanup(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        cleanup_success = True
        
        # Delete expense
        if self.created_expense_id:
            success, _ = self.run_test(
                "Delete Expense",
                "DELETE",
                f"expenses/{self.created_expense_id}",
                200
            )
            cleanup_success = cleanup_success and success
        
        # Delete act
        if self.created_act_id:
            success, _ = self.run_test(
                "Delete Act",
                "DELETE",
                f"acts/{self.created_act_id}",
                200
            )
            cleanup_success = cleanup_success and success
        
        # Delete show (should cascade delete related data)
        if self.created_show_id:
            success, _ = self.run_test(
                "Delete Show",
                "DELETE",
                f"shows/{self.created_show_id}",
                200
            )
            cleanup_success = cleanup_success and success
        
        return cleanup_success

def main():
    print("🎪 Starting Circus Show Management API Tests")
    print("=" * 50)
    
    tester = CircusAPITester()
    
    # Run all tests in sequence
    test_results = []
    
    # Basic API tests
    test_results.append(tester.test_root_endpoint())
    
    # Show management tests
    test_results.append(tester.test_create_show())
    test_results.append(tester.test_get_shows())
    test_results.append(tester.test_get_show_by_id())
    test_results.append(tester.test_update_show())
    
    # Act management tests
    test_results.append(tester.test_create_act())
    test_results.append(tester.test_get_acts_by_show())
    test_results.append(tester.test_get_act_by_id())
    test_results.append(tester.test_update_act())
    test_results.append(tester.test_reorder_acts())
    
    # Expense management tests
    test_results.append(tester.test_create_expense())
    test_results.append(tester.test_get_expenses_by_show())
    
    # Error handling tests
    test_results.append(tester.test_error_handling())
    
    # Cleanup
    test_results.append(tester.test_cleanup())
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"❌ {failed_tests} tests failed. Please check the backend implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())