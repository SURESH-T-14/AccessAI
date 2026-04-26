#!/usr/bin/env python3
"""
Quick setup script for Z-Image
"""

import subprocess
import sys
import os

def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"\n{'='*60}")
    print(f"📦 {description}")
    print(f"{'='*60}")
    print(f"Running: {cmd}\n")
    
    try:
        result = subprocess.run(cmd, shell=True, check=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed with error code {e.returncode}")
        return False

def main():
    print("""
╔═══════════════════════════════════════════════════════════╗
║          Z-Image Setup - Quick Install Script            ║
║                                                           ║
║  This will install all dependencies for Z-Image           ║
║  Image Generation System                                  ║
╚═══════════════════════════════════════════════════════════╝
    """)
    
    # Check if virtual environment is activated
    if sys.prefix == sys.base_prefix:
        print("⚠️  Warning: Virtual environment not detected")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            print("Exiting. Please activate your virtual environment first.")
            return
    
    steps = [
        ("pip install -U huggingface_hub", "Installing/Updating HuggingFace Hub"),
        ("pip install git+https://github.com/huggingface/diffusers", "Installing Diffusers (latest)"),
        ("pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118", "Installing PyTorch with CUDA 11.8"),
        ("pip install flask flask-cors", "Installing Flask for API server"),
    ]
    
    failed_steps = []
    
    for cmd, description in steps:
        if not run_command(cmd, description):
            failed_steps.append(description)
    
    # Download model
    print(f"\n{'='*60}")
    print("📥 Downloading Z-Image Model")
    print(f"{'='*60}")
    print("This may take several minutes depending on your connection...")
    
    download_cmd = "huggingface-cli download Tongyi-MAI/Z-Image"
    print(f"Running: {download_cmd}\n")
    
    try:
        subprocess.run(download_cmd, shell=True, check=True)
        print("✅ Model downloaded successfully")
    except subprocess.CalledProcessError:
        print("❌ Model download failed")
        print("💡 You can download manually later with:")
        print("   HF_XET_HIGH_PERFORMANCE=1 hf download Tongyi-MAI/Z-Image")
        failed_steps.append("Model download")
    
    # Summary
    print("\n" + "="*60)
    print("📋 SETUP SUMMARY")
    print("="*60)
    
    if not failed_steps:
        print("✅ All steps completed successfully!")
        print("\n📖 Next steps:")
        print("   1. Test generator: python zimage_generator.py")
        print("   2. Start API server: python zimage_api_server.py")
        print("   3. Check ZIMAGE_SETUP.md for integration guide")
    else:
        print(f"⚠️  {len(failed_steps)} step(s) failed:")
        for step in failed_steps:
            print(f"   ❌ {step}")
        print("\n💡 Please resolve the above errors and try again")
    
    print()

if __name__ == "__main__":
    main()
