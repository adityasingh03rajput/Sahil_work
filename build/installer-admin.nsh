!macro preInit
  ; Force kill BillVyapar Admin before installing
  nsExec::Exec 'taskkill /F /IM "BillVyapar Admin.exe" /T'
  Sleep 1000
!macroend

!macro customInstall
!macroend

!macro customUnInstall
!macroend
