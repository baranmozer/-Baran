@echo off
cd /d "%~dp0"
python main.py collect
python main.py generate
echo [%date% %time%] Haber toplama tamamlandi >> logs\auto_collect.log
