; Remote Admin Agent - Windows Installer Script
; Created with Inno Setup

#define MyAppName "Remote Admin Agent"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Your Company"
#define MyAppURL "http://localhost:8080"
#define MyAppExeName "agent.exe"
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
; SetupIconFile will use default icon if not specified
; UninstallDisplayIcon will use the exe icon

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\bin\agent.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "service-install.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "service-uninstall.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"

[Run]
; Install service - completely non-blocking
Filename: "{cmd}"; Parameters: "/c start /B ""{app}\service-install.bat"""; WorkingDir: "{app}"; Flags: runhidden nowait
; Start agent immediately in background
Filename: "{app}\agent.exe"; WorkingDir: "{app}"; Flags: runhidden nowait

[UninstallRun]
; Stop and remove the service
Filename: "{app}\service-uninstall.bat"; WorkingDir: "{app}"; Flags: runhidden nowait

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
