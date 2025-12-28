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
; Install and start the service
Filename: "{app}\service-install.bat"; WorkingDir: "{app}"; Flags: runhidden waituntilterminated
Filename: "{cmd}"; Parameters: "/c sc start {#MyAppServiceName}"; Flags: runhidden waituntilterminated

[UninstallRun]
; Stop and remove the service
Filename: "{app}\service-uninstall.bat"; WorkingDir: "{app}"; Flags: runhidden waituntilterminated

[Code]
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  // Check if service already exists and stop it
  Exec('cmd.exe', '/c sc query RemoteAdminAgent', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  if ResultCode = 0 then
  begin
    // Service exists, stop it
    Exec('cmd.exe', '/c sc stop RemoteAdminAgent', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Sleep(2000);
  end;
  Result := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    // Additional post-install tasks if needed
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    // Stop service before uninstall
    Exec('cmd.exe', '/c sc stop RemoteAdminAgent', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Sleep(2000);
  end;
end;
