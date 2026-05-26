#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$MarketplaceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillsRoot = Join-Path $env:USERPROFILE '.claude\skills'
$SharedDir = Join-Path $SkillsRoot '_career-skills-shared'

$Skills = @('career-principal', 'profile-builder', 'jd-analyzer', 'resume-tailor', 'match-diagnosis', 'source-quality-auditor')

Write-Host "Career Skills Marketplace Installer"
Write-Host "===================================="
Write-Host ""

# Check for existing installations
foreach ($skill in $Skills) {
    $skillDir = Join-Path $SkillsRoot $skill
    if (Test-Path $skillDir) {
        Write-Host "ERROR: $skillDir already exists."
        Write-Host "This installer never deletes or overwrites existing skill directories."
        Write-Host "Back up and remove existing directories manually if you want a clean reinstall."
        exit 1
    }
}

if (Test-Path $SharedDir) {
    Write-Host "ERROR: $SharedDir already exists."
    Write-Host "Back up and remove it manually if you want a clean reinstall."
    exit 1
}

# Install shared resources
New-Item -ItemType Directory -Path $SharedDir | Out-Null
Copy-Item -Path (Join-Path $MarketplaceDir 'shared\*') -Destination $SharedDir -Recurse
Copy-Item -Path (Join-Path $MarketplaceDir 'knowledge') -Destination $SharedDir -Recurse
Copy-Item -Path (Join-Path $MarketplaceDir 'marketplace.yaml') -Destination $SharedDir
Write-Host "  OK _career-skills-shared/"

# Install each skill as a top-level directory
$AllOk = $true
foreach ($skill in $Skills) {
    $src = Join-Path $MarketplaceDir "skills\$skill"
    $dst = Join-Path $SkillsRoot $skill
    Copy-Item -Path $src -Destination $dst -Recurse
    $skillFile = Join-Path $dst 'SKILL.md'
    if (Test-Path $skillFile) {
        Write-Host "  OK $skill/SKILL.md"
    } else {
        Write-Host "  MISSING $skill/SKILL.md"
        $AllOk = $false
    }
}

Write-Host ""
if ($AllOk) {
    Write-Host "Installed to: $SkillsRoot"
    Write-Host ""
    Write-Host "  Skills:  ~/.claude/skills/career-principal/"
    Write-Host "           ~/.claude/skills/profile-builder/"
    Write-Host "           ~/.claude/skills/jd-analyzer/"
    Write-Host "           ~/.claude/skills/resume-tailor/"
    Write-Host "           ~/.claude/skills/match-diagnosis/"
    Write-Host "           ~/.claude/skills/source-quality-auditor/"
    Write-Host "  Shared:  ~/.claude/skills/_career-skills-shared/"
    Write-Host ""
    Write-Host 'Next: Open Claude Code and say "帮我分析一个 JD"'
} else {
    Write-Host "ERROR: Some skills are missing. Installation may be incomplete."
    exit 1
}
