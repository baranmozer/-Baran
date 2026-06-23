@echo off
cd /d "%~dp0"
python main.py post
echo [%date% %time%] Tweet gonderimi tamamlandi >> logs\auto_post.log
