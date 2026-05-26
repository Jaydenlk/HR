#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$MarketplaceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetDir = Join-Path $env:USERPROFILE '.claude\skills\career-skills-marketplace'

Write-Host "Career Skills Marketplace Installer"
Write-Host "===================================="
Write-Host ""

if (Test-Path $TargetDir) {
    Write-Host "ERROR: $TargetDir already exists."
    Write-Host "This installer never deletes or overwrites an existing skills directory."
    Write-Host "Move the existing directory yourself if you want a clean reinstall."
    exit 1
}

New-Item -ItemType Directory -Path $TargetDir | Out-Null

Copy-Item -Path (Join-Path $MarketplaceDir 'skills')        -Destination $TargetDir -Recurse
Copy-Item -Path (Join-Path $MarketplaceDir 'shared')        -Destination $TargetDir -Recurse
Copy-Item -Path (Join-Path $MarketplaceDir 'knowledge')     -Destination $TargetDir -Recurse
Copy-Item -Path (Join-Path $MarketplaceDir 'marketplace.yaml') -Destination $TargetDir

$Skills = @('career-principal', 'profile-builder', 'jd-analyzer', 'resume-tailor', 'match-diagnosis', 'source-quality-auditor')
$AllOk = $true
foreach ($skill in $Skills) {
    $skillFile = Join-Path $TargetDir "skills\$skill\SKILL.md"
    if (Test-Path $skillFile) {
        Write-Host "  OK $skill/SKILL.md"
    } else {
        Write-Host "  MISSING $skill/SKILL.md"
        $AllOk = $false
    }
}

Write-Host ""
if ($AllOk) {
    Write-Host "Installed to: $TargetDir"
    Write-Host ""
    Write-Host 'Next: Open Claude Code and say "帮我分析一个 JD"'
} else {
    Write-Host "ERROR: Some skills are missing. Installation may be incomplete."
    exit 1
}
