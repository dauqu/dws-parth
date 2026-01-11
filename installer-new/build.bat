@echo off
echo Building installer and uninstaller...

echo.
echo Running go mod tidy...
go mod tidy

echo.
echo Building installer.exe...
go build -ldflags="-s -w" -o installer.exe installer.go
if errorlevel 1 (
    echo Failed to build installer.exe
) else (
    echo Successfully built installer.exe
)

echo.
echo Building uninstall.exe...
go build -ldflags="-s -w" -o uninstall.exe uninstall.go
if errorlevel 1 (
    echo Failed to build uninstall.exe
) else (
    echo Successfully built uninstall.exe
)

echo.
echo Done! Listing exe files:
dir /b *.exe 2>nul

pause
