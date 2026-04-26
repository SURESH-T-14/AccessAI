@echo off
REM Z-Image Quick Setup Script for Windows

echo ============================================================
echo           Z-Image Setup - Quick Install Script
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python first.
    pause
    exit /b 1
)

echo [1/5] Installing HuggingFace Hub...
pip install -U huggingface_hub
if errorlevel 1 (
    echo [ERROR] Failed to install huggingface_hub
    pause
    exit /b 1
)

echo.
echo [2/5] Installing Diffusers (latest from GitHub)...
pip install git+https://github.com/huggingface/diffusers
if errorlevel 1 (
    echo [ERROR] Failed to install diffusers
    pause
    exit /b 1
)

echo.
echo [3/5] Installing PyTorch with CUDA support...
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
if errorlevel 1 (
    echo [WARN] PyTorch installation may have failed
    echo You can install manually with CPU version:
    echo   pip install torch torchvision
)

echo.
echo [4/5] Installing Flask for API server...
pip install flask flask-cors
if errorlevel 1 (
    echo [ERROR] Failed to install Flask
    pause
    exit /b 1
)

echo.
echo [5/5] Downloading Z-Image model...
echo This may take several minutes...
huggingface-cli download Tongyi-MAI/Z-Image
if errorlevel 1 (
    echo [WARN] Model download failed
    echo You can download manually with:
    echo   HF_XET_HIGH_PERFORMANCE=1 hf download Tongyi-MAI/Z-Image
)

echo.
echo ============================================================
echo                    SETUP COMPLETE!
echo ============================================================
echo.
echo Next steps:
echo   1. Test generator: python zimage_generator.py
echo   2. Start API server: python zimage_api_server.py
echo   3. Check ZIMAGE_SETUP.md for detailed guide
echo.
pause
