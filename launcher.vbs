' DUIMP Converter - Launcher
' Inicia o servidor sem mostrar janela do console

Dim objShell, strAppDir, strExePath

objShell   = CreateObject("WScript.Shell")
strAppDir  = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
strExePath = strAppDir & "duimp-converter.exe"

' Verifica se o executavel existe
Dim objFSO
objFSO = CreateObject("Scripting.FileSystemObject")
If Not objFSO.FileExists(strExePath) Then
  MsgBox "Arquivo nao encontrado:" & vbCrLf & strExePath, 16, "DUIMP Converter"
  WScript.Quit
End If

' Inicia sem janela (0 = oculto)
objShell.Run Chr(34) & strExePath & Chr(34), 0, False

' Aguarda 2s e abre o browser (fallback caso o exe nao abra sozinho)
WScript.Sleep 2000
objShell.Run "http://localhost:3001", 1, False
