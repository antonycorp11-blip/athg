# ATHG Gravador para Android

Aplicativo nativo para tablet com Android 10 ou mais recente. O alvo inicial é o Doogee T20 (Android 12).

## Como funciona

- A câmera e a voz vêm da página `/cam/:room` aberta no iPhone, via WebRTC.
- O tablet mostra o rosto numa janela sobre o jogo. As cenas são **Rosto**, **Jogo + rosto** e **Só jogo**. Arraste a janela com um dedo e use dois dedos para alterar o tamanho. O iPhone também alterna as cenas.
- `MediaProjection` grava toda a tela, inclusive a janela do rosto. O vídeo MP4 recebe o áudio interno do jogo pelo `AudioPlaybackCapture`.
- O áudio do iPhone toca no fone Bluetooth conectado ao tablet e é gravado separadamente em WAV. Os blocos PCM são gravados em sequência contínua, sem inserir lacunas por atrasos do WebView; a finalização aplica ganho de voz com limitador suave. O microfone do tablet não entra na gravação.
- Os arquivos ficam em `Filmes/ATHG Gravacoes` e `Música/ATHG Gravacoes`.
- A biblioteca dentro do app reproduz o vídeo junto com o WAV correspondente.
- A versão 2 oferece perfis de até 720p/60, 1080p/30 e 1080p/60, conforme a capacidade anunciada pelo codificador do tablet. O FPS medido e os intervalos lentos aparecem na tela inicial depois da gravação.
- Ao abrir os jogos ATHG dentro do app, a janela entra em modo imersivo para ocultar as barras de status e navegação. Jogos externos controlam suas próprias barras do sistema.

O Android exige autorização de sobreposição, de áudio interno e de captura de tela. A autorização de tela é solicitada a cada gravação. Alguns jogos bloqueiam a captura de seu áudio interno; nesse caso, o vídeo terá imagem, mas o som do jogo não estará presente. Fones Bluetooth podem introduzir atraso no retorno da voz.

## Compilar

O workflow `.github/workflows/android-apk.yml` compila um APK de teste na branch `codex/android-recorder` e o publica como artifact `ATHG-Gravador-Android-debug`. Localmente: instale JDK 17 e Android SDK 35, depois execute `gradle -p android :app:assembleDebug` com Gradle 8.9.

O APK de teste é assinado automaticamente com a chave de desenvolvimento do Android. Ele serve para instalação direta no tablet; uma versão de distribuição precisa de chave própria.
Como cada execução do CI gera uma chave de desenvolvimento nova, talvez seja necessário desinstalar o APK de teste anterior antes de instalar o próximo.
