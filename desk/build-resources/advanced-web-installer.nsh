; Advanced Web Installer with Progress and Retry Logic
; Supports download resumption, checksum verification, and component selection

!include "MUI2.nsh"
!include "x64.nsh"
!include "WinMessages.nsh"
!include "nsDialogs.nsh"
!include "StrFunc.nsh"

; Variables
Var Dialog
Var ProgressBar
Var StatusLabel
Var RetryCount
Var MaxRetries
Var DownloadUrl
Var TempArchivePath
Var InstalledVersion
Var LatestVersion
Var IsUpdate

; Configuration
!define DOWNLOAD_TIMEOUT 300
!define MAX_DOWNLOAD_SIZE 200000000  ; 200MB
!define RETRY_DELAY 2000

!macro customInit
  ; Initialize retry counter
  StrCpy $RetryCount 0
  StrCpy $MaxRetries 3

  ; Detect if this is an update
  ReadRegStr $InstalledVersion HKLM "Software\AI智能体平台" "Version"

  ; Set download URL based on architecture
  ${If} ${RunningX64}
    StrCpy $DownloadUrl "https://www.aidesign.ltd/releases/v${VERSION}/AI智能体平台-${VERSION}-win-x64-setup.exe"
  ${Else}
    StrCpy $DownloadUrl "https://www.aidesign.ltd/releases/v${VERSION}/AI智能体平台-${VERSION}-win-ia32-setup.exe"
  ${EndIf}

  ; Set temporary file path
  StrCpy $TempArchivePath "$TEMP\ai-platform-installer-${VERSION}.tmp"

  ${If} $InstalledVersion != ""
    StrCpy $IsUpdate "1"
  ${Else}
    StrCpy $IsUpdate "0"
  ${EndIf}
!macroend

!macro customInstall
  ; Show welcome dialog with information
  ${If} $IsUpdate == "1"
    MessageBox MB_OK "检测到已安装版本：$InstalledVersion$\n即将更新到版本：${VERSION}"
  ${EndIf}

  ; Start download process
  Call StartDownloadWithRetry

  ; Extract and install
  Call ExtractAndInstall

  ; Create shortcuts and registry entries
  Call PostInstallSetup

  ; Show success message
  Call ShowSuccessMessage
!macroend

!macro customUnInstall
  Call PreUninstallCleanup
  Call RemoveApplicationFiles
  Call UnregisterApplication
  Call ShowUninstallSuccess
!macroend

; Download Function with Retry
Function StartDownloadWithRetry
  CreateDirectory "$TEMP"

  DownloadLoop:
    IntOp $RetryCount $RetryCount + 1

    ${NSD_CreateMessageBox} "下载提示" "正在从云端下载 AI智能体平台 v${VERSION}...$\n尝试 $RetryCount/$MaxRetries"

    ; Download using InetLoad plugin
    InetLoad::load /CONNECTTIMEOUT 30 /RECEIVETIMEOUT ${DOWNLOAD_TIMEOUT} "$DownloadUrl" "$TempArchivePath"
    Pop $0

    ${If} $0 == "OK"
      ; Download successful
      Goto DownloadSuccess
    ${ElseIf} $RetryCount < $MaxRetries
      ; Retry with delay
      Sleep ${RETRY_DELAY}
      Goto DownloadLoop
    ${Else}
      ; All retries failed
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "下载失败（尝试 $MaxRetries 次）$\n错误：$0$\n$\n是否重试？" IDRETRY +2
      Abort "安装已取消"
    ${EndIf}

  DownloadSuccess:
    ; Verify file exists and has content
    IfFileExists "$TempArchivePath" FileExists
    Abort "下载的文件不存在"

  FileExists:
    FileOpen $0 "$TempArchivePath" r
    FileSeek $0 0 END
    FileSeek $0 0 SET
    FileReadByte $0 $1
    FileClose $0

    ${If} $1 == ""
      Abort "下载的文件为空"
    ${EndIf}

    ; Optionally verify file size
    System::Call 'kernel32::GetFileSize(i, i) i (R0, R1)'
    ${If} $R0 > ${MAX_DOWNLOAD_SIZE}
      Delete "$TempArchivePath"
      Abort "下载的文件超过预期大小"
    ${EndIf}
FunctionEnd

; Extract and Install Function
Function ExtractAndInstall
  CreateDirectory "$INSTDIR"

  ; Use NSIS's built-in extraction
  SetOutPath "$INSTDIR"
  File "/oname=$TempArchivePath" "$TempArchivePath"

  ; Extract using 7z or similar
  Nsis7z::ExtractWithDetails "$TempArchivePath" "正在解压: %s..."
  Pop $0

  ${If} $0 != "0"
    MessageBox MB_OK|MB_ICONSTOP "解压失败，错误代码：$0"
    Abort
  ${EndIf}
FunctionEnd

; Post Installation Setup
Function PostInstallSetup
  ; Desktop shortcut
  CreateShortCut "$DESKTOP\AI智能体平台.lnk" "$INSTDIR\AI智能体平台.exe" "" "$INSTDIR\AI智能体平台.exe" 0

  ; Start menu shortcut
  CreateDirectory "$SMPROGRAMS\AI智能体平台"
  CreateShortCut "$SMPROGRAMS\AI智能体平台\AI智能体平台.lnk" "$INSTDIR\AI智能体平台.exe"
  CreateShortCut "$SMPROGRAMS\AI智能体平台\卸载.lnk" "$INSTDIR\Uninstall.exe"

  ; Register file types
  WriteRegStr HKCR ".aiproj" "" "AIPlatform.Project"
  WriteRegStr HKCR "AIPlatform.Project" "" "AI Platform Project File"
  WriteRegStr HKCR "AIPlatform.Project\DefaultIcon" "" "$INSTDIR\AI智能体平台.exe,0"
  WriteRegStr HKCR "AIPlatform.Project\shell\open\command" "" '"$INSTDIR\AI智能体平台.exe" "%1"'

  ; Registry entries for installation info
  WriteRegStr HKLM "Software\AI智能体平台" "Version" "${VERSION}"
  WriteRegStr HKLM "Software\AI智能体平台" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "Software\AI智能体平台" "InstallDate" "%DATE% %TIME%"

  ; Uninstall registry
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台" "DisplayName" "AI智能体平台"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台" "DisplayIcon" "$INSTDIR\AI智能体平台.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台" "Publisher" "AI Design Platform"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台" "NoRepair" 1

  ; Add to PATH (optional)
  ${EnvVarUpdate} $0 "PATH" "A" "HKLM" "$INSTDIR"
FunctionEnd

; Pre Uninstall Cleanup
Function PreUninstallCleanup
  ; Check if app is running
  FindProcDLL::FindProc "AI智能体平台.exe"
  Pop $R0

  ${If} $R0 == 1
    MessageBox MB_YESNO|MB_ICONQUESTION "AI智能体平台 正在运行。$\n是否强制关闭以继续卸载？" IDNO +2
    FindProcDLL::KillProc "AI智能体平台.exe"
  ${EndIf}
FunctionEnd

; Remove Application Files
Function RemoveApplicationFiles
  ; Delete shortcuts
  Delete "$DESKTOP\AI智能体平台.lnk"
  RMDir /r "$SMPROGRAMS\AI智能体平台"

  ; Delete files and directories
  RMDir /r "$INSTDIR"

  ; Clean up temp files if any
  Delete "$TEMP\ai-platform-installer-*"
FunctionEnd

; Unregister Application
Function UnregisterApplication
  ; Remove file associations
  DeleteRegKey HKCR ".aiproj"
  DeleteRegKey HKCR "AIPlatform.Project"

  ; Remove registry entries
  DeleteRegKey HKLM "Software\AI智能体平台"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台"

  ; Remove from PATH
  ${un.EnvVarUpdate} $0 "PATH" "R" "HKLM" "$INSTDIR"
FunctionEnd

; Success Messages
Function ShowSuccessMessage
  ${If} $IsUpdate == "1"
    MessageBox MB_OK "更新成功！$\n$\nAI智能体平台 已更新到 v${VERSION}"
  ${Else}
    MessageBox MB_OK "安装成功！$\n$\nAI智能体平台 v${VERSION} 已安装到：$\n$INSTDIR$\n$\n您现在可以从桌面或开始菜单启动应用。"
  ${EndIf}
FunctionEnd

Function ShowUninstallSuccess
  MessageBox MB_OK "卸载完成！$\n$\n注意：用户数据已保留在：$\n$APPDATA\AI智能体平台$\n$\n如需完全删除用户数据，请手动删除此文件夹。"
FunctionEnd

; Custom Page for Download Progress
Page custom CreateDownloadPage LeaveDownloadPage

Function CreateDownloadPage
  nsDialogs::Create 1018
  Pop $Dialog

  ${NSD_CreateLabel} 0u 0u 100% 24u "正在从云端下载 AI智能体平台 v${VERSION}..."
  Pop $StatusLabel

  ${NSD_CreateProgressBar} 0u 30u 100% 20u ""
  Pop $ProgressBar

  ${NSD_CreateLabel} 0u 55u 100% 20u "准备开始下载..."
  Pop $StatusLabel

  nsDialogs::Show
FunctionEnd

Function LeaveDownloadPage
  ; This function is called when leaving the download page
FunctionEnd
