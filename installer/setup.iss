; Remote Admin Agent - Windows Installer Script
; Created with Inno Setup

#define MyAppName "Remote Admin Agent"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Remote Admin"
#define MyAppURL "https://dws-parth.daucu.com"
#define MyAppExeName "dws-agent.exe"
#define MyAppServiceName "RemoteAdminAgent"

[Setup]
AppId={{A7B8C9D0-E1F2-4A5B-9C8D-7E6F5A4B3C2D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\bin
OutputBaseFilename=RemoteAdminAgent-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
AllowNoIcons=yes
; SetupIconFile will use default icon if not specified
; UninstallDisplayIcon will use the exe icon

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\agent\dws-agent.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\installer\service-install.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\installer\service-uninstall.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"

[Run]
; Start agent immediately in background (without service)
Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Flags: runhidden nowait

[UninstallRun]
; Stop any running agent processes before uninstalling
Filename: "{cmd}"; Parameters: "/c taskkill /F /IM {#MyAppExeName}"; Flags: runhidden nowait

[Registry]
; Add to Windows Startup - Run on boot
Root: HKA; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#MyAppName}"; ValueData: """{app}\{#MyAppExeName}"""; Flags: uninsdeletevalue

[Code]

function InitializeSetup(): Boolean;
begin
  // No blocking operations - just return true
  Result := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  // Empty - no post-install operations that block
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  // Empty - uninstall script handles service stop
end;
