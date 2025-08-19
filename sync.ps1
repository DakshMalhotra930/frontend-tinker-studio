$projectPath = "C:\Users\daksh\dev\frontend-tinker-studio"
$logPath = "$projectPath\sync.log"
$git = "git"  # Use full path to git.exe if necessary, e.g. "C:\Program Files\Git\bin\git.exe"

"Starting sync at $(Get-Date)" | Out-File $logPath -Force

while ($true) {
    try {
        Set-Location $projectPath
        $changes = & $git status --porcelain
        if ($changes) {
            "Changes detected at $(Get-Date):" | Out-File $logPath -Append
            & $git add . 2>&1 | Out-File $logPath -Append
            $commitMessage = "Auto-sync $(Get-Date -Format 'HH:mm:ss')"
            & $git commit -m $commitMessage 2>&1 | Out-File $logPath -Append
            & $git push origin main 2>&1 | Out-File $logPath -Append
            "Synced at $(Get-Date)" | Out-File $logPath -Append
        }
        else {
            "No changes at $(Get-Date)" | Out-File $logPath -Append
        }
    }
    catch {
        "ERROR at $(Get-Date): $_" | Out-File $logPath -Append
    }
    Start-Sleep -Seconds 5
}
