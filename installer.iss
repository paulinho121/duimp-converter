; =============================================================
;  DUIMP Converter - Inno Setup 6 Script
;  Para compilar: abra este arquivo no Inno Setup 6 e
;  clique em Build > Compile  (ou pressione Ctrl+F9)
;
;  Download Inno Setup: https://jrsoftware.org/isdl.php
; =============================================================

#define MyAppName      "DUIMP Converter"
#define MyAppVersion   "1.0.0"
#define MyAppPublisher "Multi Comercial & Importadora"
#define MyAppURL       "http://localhost:3001"
#define MyAppExeName   "duimp-converter.exe"
#define MyAppLauncher  "launcher.vbs"
#define SourceDir      "dist"

[Setup]
; Identificador unico do app (nao alterar apos primeira instalacao)
AppId={{A7F3C2D1-8B4E-4F6A-9D3C-1E5B7A2F8C4D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=dist
OutputBaseFilename=DUIMPConverter-Setup-v{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
UninstallDisplayIcon={app}\{#MyAppExeName}
; Icone personalizado (opcional - coloque icon.ico na pasta do projeto)
; SetupIconFile=dist\icon.ico
ShowLanguageDialog=no
LanguageDetectionMethod=none
MinVersion=6.1
ArchitecturesInstallIn64BitMode=x64
WizardImageAlphaFormat=premultiplied

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon";   Description: "Criar atalho na {cm:DesktopName}"; GroupDescription: "Atalhos:"; Flags: checked
Name: "startmenuicon"; Description: "Criar atalho no Menu Iniciar";       GroupDescription: "Atalhos:"; Flags: checked

[Files]
; Executavel principal
Source: "{#SourceDir}\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

; Frontend React (pasta public ao lado do exe)
Source: "{#SourceDir}\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs

; Launcher VBS (abre sem janela do console)
Source: "launcher.vbs"; DestDir: "{app}"; Flags: ignoreversion

; Icone (se existir)
; Source: "{#SourceDir}\icon.ico"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

[Icons]
; Atalho na Area de Trabalho
Name: "{autodesktop}\{#MyAppName}"; \
  Filename: "{sys}\wscript.exe"; \
  Parameters: """{app}\{#MyAppLauncher}"""; \
  WorkingDir: "{app}"; \
  Comment: "Conversor DUIMP para XML"; \
  Tasks: desktopicon

; Atalho no Menu Iniciar
Name: "{group}\{#MyAppName}"; \
  Filename: "{sys}\wscript.exe"; \
  Parameters: """{app}\{#MyAppLauncher}"""; \
  WorkingDir: "{app}"; \
  Comment: "Conversor DUIMP para XML"; \
  Tasks: startmenuicon

; Desinstalar no Menu Iniciar
Name: "{group}\Desinstalar {#MyAppName}"; \
  Filename: "{uninstallexe}"

[Run]
; Executa o app apos instalar (opcional)
Filename: "{sys}\wscript.exe"; \
  Parameters: """{app}\{#MyAppLauncher}"""; \
  WorkingDir: "{app}"; \
  Description: "Iniciar {#MyAppName} agora"; \
  Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
// Verifica se o app ja esta rodando antes de instalar
function InitializeSetup(): Boolean;
begin
  Result := True;
end;
