"""
Test MongoDB Connection
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_mongodb_connection():
    """Test MongoDB connection"""
    try:
        from pymongo import MongoClient
        from pymongo.server_api import ServerApi
        
        mongodb_uri = os.getenv('MONGODB_URI')
        
        if not mongodb_uri:
            print("❌ MONGODB_URI not found in .env file")
            return False
        
        print("🔄 Testing MongoDB connection...")
        print(f"📍 URI: {mongodb_uri[:30]}...{mongodb_uri[-20:]}")
        
        # Create a MongoClient with ServerApi
        client = MongoClient(mongodb_uri, server_api=ServerApi('1'))
        
        # Test the connection
        client.admin.command('ping')
        
        print("✅ MongoDB connection successful!")
        
        # List databases
        dbs = client.list_database_names()
        print(f"📚 Available databases: {dbs}")
        
        # Get or create accessai database
        db = client['accessai']
        
        # List collections
        collections = db.list_collection_names()
        print(f"📦 Collections in 'accessai': {collections if collections else 'None (will be created)'}")
        
        # Test insert/find/delete
        print("\n🔬 Testing CRUD operations...")
        test_collection = db['test_collection']
        
        # Insert
        result = test_collection.insert_one({'test': 'data', 'timestamp': 'now'})
        print(f"✅ Insert successful, ID: {result.inserted_id}")
        
        # Find
        doc = test_collection.find_one({'_id': result.inserted_id})
        print(f"✅ Find successful: {doc}")
        
        # Delete
        test_collection.delete_one({'_id': result.inserted_id})
        print(f"✅ Delete successful")
        
        # Check generated_images collection
        print("\n🎨 Checking 'generated_images' collection...")
        gen_images = db['generated_images']
        count = gen_images.count_documents({})
        print(f"📊 Current images in MongoDB: {count}")
        
        client.close()
        print("\n✅ All tests passed! MongoDB is ready to use.")
        return True
        
    except Exception as e:
        print(f"\n❌ MongoDB connection failed: {e}")
        print("\n💡 Common issues:")
        print("   1. Check password has special characters URL-encoded (@ = %40)")
        print("   2. Check IP whitelist in MongoDB Atlas (allow 0.0.0.0/0 for testing)")
        print("   3. Check network connection")
        print("   4. Verify cluster name and credentials")
        return False

if __name__ == "__main__":
    test_mongodb_connection()
