; Custom installer script for Windows

!macro customInstall
  ; 添加桌面快捷方式
  CreateShortCut "$DESKTOP\AI智能体平台.lnk" "$INSTDIR\AI智能体平台.exe"

  ; 添加开始菜单快捷方式
  CreateShortCut "$STARTMENU\Programs\AI智能体平台.lnk" "$INSTDIR\AI智能体平台.exe"

  ; 注册文件关联
  WriteRegStr HKCR ".aiproj" "" "AIPlatform.Project"
  WriteRegStr HKCR "AIPlatform.Project" "" "AI Platform Project File"
  WriteRegStr HKCR "AIPlatform.Project\DefaultIcon" "" "$INSTDIR\AI智能体平台.exe,0"
  WriteRegStr HKCR "AIPlatform.Project\shell\open\command" "" '"$INSTDIR\AI智能体平台.exe" "%1"'

  ; 添加到系统PATH
  ; Uncomment the following lines if you want to add the app to system PATH
  ; ${EnvVarUpdate} $0 "PATH" "A" "HKLM" "$INSTDIR"

  ; 创建卸载信息
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台" "DisplayName" "AI智能体平台"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台" "DisplayIcon" "$INSTDIR\AI智能体平台.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台" "Publisher" "AI Platform Team"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台" "DisplayVersion" "${VERSION}"
!macroend

!macro customUnInstall
  ; 删除桌面快捷方式
  Delete "$DESKTOP\AI智能体平台.lnk"

  ; 删除开始菜单快捷方式
  Delete "$STARTMENU\Programs\AI智能体平台.lnk"

  ; 删除文件关联
  DeleteRegKey HKCR ".aiproj"
  DeleteRegKey HKCR "AIPlatform.Project"

  ; 删除卸载信息
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI智能体平台"
!macroend
