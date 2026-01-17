; Web Installer Script for AI Platform
; Minimal configuration for nsis-web

; Variables
Var DownloadURL

!macro customInit
  ; 配置下载URL
  StrCpy $DownloadURL "https://www.aidesign.ltd/releases/v${VERSION}/AI智能体平台-${VERSION}-win-x64.7z"
!macroend

!macro customInstall
  ; 桌面快捷方式
  CreateShortCut "$DESKTOP\AI智能体平台.lnk" "$INSTDIR\AI智能体平台.exe"

  ; 开始菜单快捷方式
  CreateShortCut "$STARTMENU\Programs\AI智能体平台.lnk" "$INSTDIR\AI智能体平台.exe"

  ; 文件关联
  WriteRegStr HKCR ".aiproj" "" "AIPlatform.Project"
  WriteRegStr HKCR "AIPlatform.Project" "" "AI Platform Project File"
  WriteRegStr HKCR "AIPlatform.Project\DefaultIcon" "" "$INSTDIR\AI智能体平台.exe,0"
  WriteRegStr HKCR "AIPlatform.Project\shell\open\command" "" '"$INSTDIR\AI智能体平台.exe" "%1"'

  ; 注册表信息
  WriteRegStr HKLM "Software\AI智能体平台" "Version" "${VERSION}"
  WriteRegStr HKLM "Software\AI智能体平台" "InstallPath" "$INSTDIR"
!macroend

!macro customUnInstall
  Delete "$DESKTOP\AI智能体平台.lnk"
  Delete "$STARTMENU\Programs\AI智能体平台.lnk"
  DeleteRegKey HKCR ".aiproj"
  DeleteRegKey HKCR "AIPlatform.Project"
  DeleteRegKey HKLM "Software\AI智能体平台"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台"
!macroend
