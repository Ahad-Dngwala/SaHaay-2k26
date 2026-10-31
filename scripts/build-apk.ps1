# scripts/build-apk.ps1
# Build script for SaHaay Citizen and Driver Android APKs

$ErrorActionPreference = "Stop"

$SDK_DIR = "C:\Users\ahadd\AppData\Local\Android\Sdk"
$BUILD_TOOLS = "$SDK_DIR\build-tools\34.0.0"
$ANDROID_JAR = "$SDK_DIR\platforms\android-34\android.jar"
$JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$JAVAC = "$JAVA_HOME\bin\javac.exe"
$JAR = "$JAVA_HOME\bin\jar.exe"
$KEYSTORE = "artifacts\sahaay-release-key.jks"

function Build-App($appPath, $packageName, $outputApkName) {
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host "Building $outputApkName ($packageName)..." -ForegroundColor Cyan
    Write-Host "====================================================" -ForegroundColor Cyan

    $buildDir = "$appPath\build"
    if (Test-Path $buildDir) { Remove-Item -Recurse -Force $buildDir }
    New-Item -ItemType Directory -Force -Path "$buildDir\gen", "$buildDir\classes", "$buildDir\dex" | Out-Null

    # 1. AAPT2 Compile Resources
    Write-Host "[1/6] Compiling resources with aapt2..."
    & "$BUILD_TOOLS\aapt2.exe" compile --dir "$appPath\res" -o "$buildDir\compiled_res.zip"
    if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

    # 2. AAPT2 Link Resources & Assets
    Write-Host "[2/6] Linking resources and assets..."
    & "$BUILD_TOOLS\aapt2.exe" link -I $ANDROID_JAR --manifest "$appPath\AndroidManifest.xml" -A "$appPath\assets" -o "$buildDir\app-unsigned.apk" --java "$buildDir\gen" "$buildDir\compiled_res.zip" --auto-add-overlay
    if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }

    # 3. Javac Compile (targeting Java 8 for Android D8 compatibility)
    Write-Host "[3/6] Compiling Java classes (Java 8 target)..."
    $javaFiles = Get-ChildItem -Path "$buildDir\gen", "$appPath\src" -Recurse -Filter *.java | Select-Object -ExpandProperty FullName
    & $JAVAC -encoding UTF-8 -source 8 -target 8 -d "$buildDir\classes" -cp $ANDROID_JAR $javaFiles
    if ($LASTEXITCODE -ne 0) { throw "javac failed" }

    # 4. D8 Compile Dex
    Write-Host "[4/6] Compiling DEX with d8..."
    $classFiles = Get-ChildItem -Path "$buildDir\classes" -Recurse -Filter *.class | Select-Object -ExpandProperty FullName
    & cmd /c "$BUILD_TOOLS\d8.bat" --lib $ANDROID_JAR --output "$buildDir\dex" $classFiles
    if ($LASTEXITCODE -ne 0) { throw "d8 failed" }

    # 5. Package classes.dex into APK
    Write-Host "[5/6] Packaging classes.dex into APK..."
    Push-Location "$buildDir\dex"
    & $JAR uf "..\app-unsigned.apk" classes.dex
    Pop-Location

    # 6. Zipalign & Apksigner
    Write-Host "[6/6] Zipaligning and signing APK..."
    & "$BUILD_TOOLS\zipalign.exe" -f -v 4 "$buildDir\app-unsigned.apk" "$buildDir\app-aligned.apk" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

    $outApk = "artifacts\apk\$outputApkName"
    & cmd /c "$BUILD_TOOLS\apksigner.bat" sign --ks $KEYSTORE --ks-pass pass:sahaay2026 --out $outApk "$buildDir\app-aligned.apk"
    if ($LASTEXITCODE -ne 0) { throw "apksigner failed" }

    $hash = (Get-FileHash -Algorithm SHA256 $outApk).Hash
    $size = (Get-Item $outApk).Length
    Write-Host "✅ SUCCESS: $outputApkName ($size bytes)" -ForegroundColor Green
    Write-Host "   SHA-256: $hash" -ForegroundColor Yellow
}

Build-App "apps\citizen-app" "org.sahaay.citizen" "SaHaay-Citizen.apk"
Build-App "apps\driver-app" "org.sahaay.driver" "SaHaay-Driver.apk"
