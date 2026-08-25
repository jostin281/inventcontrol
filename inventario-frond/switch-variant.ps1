# Cambia el proyecto Android entre la variante "local" (tu red de casa) y
# "cloud" (Render), y genera el .apk correspondiente.
#
# Uso, desde PowerShell parado en inventario-frond:
#   .\switch-variant.ps1 local
#   .\switch-variant.ps1 cloud
#
# El .apk queda en:
#   android\app\build\outputs\apk\debug\app-debug.apk

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("local", "cloud")]
    [string]$Variant
)

$ErrorActionPreference = "Stop"

$gradlePath = "android\app\build.gradle"
$stringsPath = "android\app\src\main\res\values\strings.xml"

if ($Variant -eq "local") {
    $appId = "com.invencontrol.app.local"
    $appName = "InvenControl 2.0"
    $ngConfig = "mobile-local"
} else {
    $appId = "com.invencontrol.app"
    $appName = "InvenControl"
    $ngConfig = "mobile"
}

# IMPORTANTE: capacitor.config.ts lee esta variable de entorno para decidir
# el appId/appName/scheme que se copian a android/.../capacitor.config.json
# durante "npx cap sync". Si no se define, cap sync SIEMPRE genera la
# variante "cloud", sin importar qué variante hayas elegido acá.
$env:APP_VARIANT = $Variant

Write-Host "==> Variante: $Variant ($appId)" -ForegroundColor Cyan

(Get-Content $gradlePath) -replace 'applicationId "com\.invencontrol\.app(\.local)?"', "applicationId `"$appId`"" | Set-Content $gradlePath

@"
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">$appName</string>
    <string name="title_activity_main">$appName</string>
    <string name="package_name">$appId</string>
    <string name="custom_url_scheme">$appId</string>
</resources>
"@ | Set-Content $stringsPath

Write-Host "==> ng build --configuration $ngConfig" -ForegroundColor Cyan
ng build --configuration $ngConfig
if ($LASTEXITCODE -ne 0) { throw "ng build fallo" }

Write-Host "==> npx cap sync android (APP_VARIANT=$env:APP_VARIANT)" -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw "cap sync fallo" }

Write-Host "==> Verificando que capacitor.config.json haya quedado en modo '$Variant'" -ForegroundColor Cyan
$syncedConfig = Get-Content "android\app\src\main\assets\capacitor.config.json" -Raw
if ($syncedConfig -match [regex]::Escape($appId)) {
    Write-Host "    OK: capacitor.config.json tiene appId=$appId" -ForegroundColor DarkGray
} else {
    Write-Host "    ADVERTENCIA: capacitor.config.json NO quedo con appId=$appId. Revisa capacitor.config.ts" -ForegroundColor Red
    Write-Host $syncedConfig -ForegroundColor Red
}

Write-Host "==> Buscando el Java que trae Android Studio (JAVA_HOME)" -ForegroundColor Cyan
if (-not $env:JAVA_HOME) {
    $candidatos = @(
        "$env:LOCALAPPDATA\Programs\Android Studio\jbr",
        "C:\Program Files\Android\Android Studio\jbr",
        "C:\Program Files\Android\Android Studio\jre"
    )
    $encontrado = $candidatos | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($encontrado) {
        $env:JAVA_HOME = $encontrado
        Write-Host "    JAVA_HOME = $encontrado" -ForegroundColor DarkGray
    } else {
        Write-Host "    No lo encontre en las ubicaciones habituales." -ForegroundColor Yellow
    }
}

Write-Host "==> Generando APK (gradlew assembleDebug)" -ForegroundColor Cyan
Push-Location android
try {
    .\gradlew.bat assembleDebug
    $gradleOk = ($LASTEXITCODE -eq 0)
} finally {
    Pop-Location
}

if (-not $gradleOk) {
    Write-Host ""
    Write-Host "No se pudo generar el APK automaticamente (version de Java incompatible con Gradle)." -ForegroundColor Yellow
    Write-Host "El proyecto YA quedo listo en modo '$Variant' (build.gradle, strings.xml y capacitor.config.json actualizados)." -ForegroundColor Yellow
    Write-Host "Terminalo con Android Studio:" -ForegroundColor Yellow
    Write-Host "  1) npx cap open android" -ForegroundColor Yellow
    Write-Host "  2) File > Settings > Build, Execution, Deployment > Build Tools > Gradle" -ForegroundColor Yellow
    Write-Host "     En 'Gradle JDK' elige una version 17 o 21 (NO la mas nueva/preview). Si no hay ninguna, usa 'Download JDK...' y baja la 21." -ForegroundColor Yellow
    Write-Host "  3) Espera a que termine el Gradle Sync (barra de abajo)." -ForegroundColor Yellow
    Write-Host "  4) Build -> Build Bundle(s) / APK(s) -> Build APK(s)" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Listo. APK generado en: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Green
Write-Host "Esta version se va a instalar como: $appName" -ForegroundColor Green
