@echo off
REM Galatasaray Haber Botu - Windows Görev Zamanlayıcı Kurulumu
REM Bu scripti YÖNETİCİ OLARAK çalıştır (Sağ tık → Yönetici olarak çalıştır)

set BOT_PATH=%~dp0

REM Görev 1: Her 2 saatte bir haber topla + taslak üret
schtasks /create /tn "GS-Haber-Botu-Collect" /tr "\"%BOT_PATH%auto_collect.bat\"" /sc HOURLY /mo 2 /st 08:00 /f
echo [OK] Haber toplama gorevi olusturuldu (her 2 saatte bir)

REM Görev 2: Her saat başı onaylı tweetleri gönder
schtasks /create /tn "GS-Haber-Botu-Post" /tr "\"%BOT_PATH%auto_post.bat\"" /sc HOURLY /mo 1 /st 08:30 /f
echo [OK] Tweet gonderim gorevi olusturuldu (her saat basi)

echo.
echo ============================================
echo   Gorevler basariyla olusturuldu!
echo.
echo   Haber Toplama: Her 2 saatte bir (08:00'den itibaren)
echo   Tweet Gonderim: Her saat basi (08:30'dan itibaren)
echo.
echo   Gorevleri gormek icin:
echo     schtasks /query /tn "GS-Haber-Botu-Collect"
echo     schtasks /query /tn "GS-Haber-Botu-Post"
echo.
echo   Gorevleri silmek icin:
echo     schtasks /delete /tn "GS-Haber-Botu-Collect" /f
echo     schtasks /delete /tn "GS-Haber-Botu-Post" /f
echo ============================================
pause
