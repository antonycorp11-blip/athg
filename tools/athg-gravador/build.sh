#!/bin/sh
# Compila o ATHG Gravador e instala em ~/Applications/ATHG Gravador.app
# Uso: sh tools/athg-gravador/build.sh
set -e
cd "$(dirname "$0")"
APP="$HOME/Applications/ATHG Gravador.app"
mkdir -p "$APP/Contents/MacOS"
cp Info.plist "$APP/Contents/Info.plist"
swiftc -O -target x86_64-apple-macos13.0 main.swift -o "$APP/Contents/MacOS/ATHG Gravador" \
  -framework AppKit -framework AVFoundation -framework ScreenCaptureKit -framework WebKit -framework SwiftUI -framework Carbon -framework CoreImage
# Assinatura local: o macOS guarda a permissão de gravação de tela para este app.
codesign --force --deep -s - "$APP"
echo "Instalado em: $APP"
