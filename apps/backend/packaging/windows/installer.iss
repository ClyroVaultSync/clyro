; Setup wizard for Clyro Local Sync Server, compiled with Inno Setup 6 by scripts/build-windows.mjs,
; which passes AppVersion, BuildDir (the folder holding the two built exes) and OutputDir.
;
; Installs per user (no admin prompt) into %LOCALAPPDATA%\Programs. The vault lives separately in
; %LOCALAPPDATA%\Clyro, so upgrading or reinstalling never touches it.

#ifndef AppVersion
  #error Build with scripts/build-windows.mjs, which passes /DAppVersion, /DBuildDir and /DOutputDir.
#endif

#define AppName "Clyro Local Sync Server"
#define RunValueName "Clyro Local Sync Server"

[Setup]
AppId={{BAEC335A-C3D9-401C-BDCC-5CFDA065A3AC}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=ClyroVaultSync
AppPublisherURL=https://clyrovault.pages.dev
DefaultDirName={autopf}\{#AppName}
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename=ClyroLocalSyncServer-Setup-{#AppVersion}
SetupIconFile=clyro.ico
UninstallDisplayIcon={app}\ClyroSync.exe
UninstallDisplayName={#AppName}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
; The running app is stopped in [Code] below instead of through Windows' Restart Manager.
CloseApplications=no

[Files]
Source: "{#BuildDir}\ClyroSync.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#BuildDir}\clyro-sync-server.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\ClyroSync.exe"

[Registry]
; Start at sign-in. The tray menu's "Start with Windows" toggles this same value.
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#RunValueName}"; ValueData: """{app}\ClyroSync.exe"""; Flags: uninsdeletevalue

[Run]
Filename: "{app}\ClyroSync.exe"; Description: "Start {#AppName} now"; Flags: nowait postinstall

[Code]
procedure StopRunningApp;
var
  ResultCode: Integer;
begin
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM ClyroSync.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM clyro-sync-server.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  // Give Windows a moment to release the exe files before they are replaced or deleted.
  Sleep(1000);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  StopRunningApp;
  Result := '';
end;

function InitializeUninstall(): Boolean;
begin
  StopRunningApp;
  Result := True;
end;

// The vault is kept unless the user explicitly says otherwise; a silent uninstall always keeps it.
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    if SuppressibleMsgBox('Also delete your Clyro vault data?' + #13#10#13#10 +
        'This permanently removes your encrypted vault from this PC. Only choose Yes if you have ' +
        'an exported backup or no longer need these passwords.',
        mbConfirmation, MB_YESNO or MB_DEFBUTTON2, IDNO) = IDYES then
      DelTree(ExpandConstant('{localappdata}\Clyro'), True, True, True);
  end;
end;
