@echo off
setlocal

:: Set the destination directory name
set "DEST_DIR=docker"

:: If the directory exists, remove it and all its contents
if exist "%DEST_DIR%" (
    echo Cleaning existing directory: %DEST_DIR%
    rmdir /s /q "%DEST_DIR%"
)

:: Create a fresh destination directory
echo Creating fresh directory: %DEST_DIR%
mkdir "%DEST_DIR%"

:: Execute Robocopy
:: /E   : Copies subdirectories, including empty ones.
:: /XD  : Excludes directories matching these names/paths.
:: /XF  : Excludes files matching these names/patterns.
:: /R:1 /W:1 : Retries once on failure with a 1-second wait.
robocopy "./" "%DEST_DIR%" /E ^
    /XD .git .github node_modules .vscode .idea .claude coverage .cache "%DEST_DIR%" server\dist server\uploads client\dist client\dist-ssr raw ^
    /XF .gitignore README.md *.bat *.log .env .env.local .env.*.local .env.example .env.production ^
    .eslintrc* .eslintcache .prettierrc* .prettierignore ^
    *.tsbuildinfo *.code-workspace npm-debug.log* yarn-debug.log* yarn-error.log*

:: Note: Robocopy returns exit codes. 1 means files were copied successfully.
if %ERRORLEVEL% LEQ 1 (
    echo.
    echo Files have been refreshed in: %DEST_DIR%/

    :: Remove all files inside uploads directory (keep the directory itself for Docker volume mount)
    if exist "%DEST_DIR%\server\uploads" (
        echo Cleaning uploads directory...
        del /q "%DEST_DIR%\server\uploads\*" 2>nul
        for /d %%i in ("%DEST_DIR%\server\uploads\*") do rmdir /s /q "%%i"
    )

    :: Check for production environment file and copy it
    echo Checking for environment configuration files...

    if exist ".env.production" (
        echo Found .env.production, copying to %DEST_DIR%\.env
        copy ".env.production" "%DEST_DIR%\.env"
    ) else (
        echo WARNING: .env.production not found. Create it before building Docker images.
    )

    echo.
    echo Process complete!
) else (
    echo.
    echo Robocopy finished with issues. Please check the output above.
)

pause
