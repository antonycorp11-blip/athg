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
# A permissão de captura depende da identidade de assinatura. Uma assinatura
# ad hoc muda a cada compilação e faz o macOS pedir autorização novamente.
codesign --force --deep --sign "ATHG Gravador Local" "$APP"
codesign --verify --deep --strict "$APP"
echo "Instalado em: $APP"
