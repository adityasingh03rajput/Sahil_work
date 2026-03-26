!macro preInit
  ; Force kill BillVyapar before installing
  nsExec::Exec 'taskkill /F /IM "BillVyapar.exe" /T'
  Sleep 1000
!macroend

!macro customInstall
!macroend

!macro customUnInstall
!macroend
