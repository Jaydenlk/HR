#Requires -Version 5.1
# 推荐安装方式 = Claude Code 插件(一次装好、归一组):
#   /plugin marketplace add Jaydenlk/HR
#   /plugin install career-principal@career-skills
# 本脚本是 loose 备选:把 skills/ 下所有目录拷进 ~/.claude/skills/。
# 仅 career-principal 含 SKILL.md(唯一自动触发入口);37 个 worker 为 PLAYBOOK.md,
# 由主理人读取执行;_career-skills-shared/ 为共享资源。三者都需就位。
param(
    [ValidateSet('claude', 'codex')]
    [string]$Target = 'claude'
)

$ErrorActionPreference = 'Stop'

$MarketplaceDir = Split-Path -Parent $MyInvocation.MyCommand.Path

switch ($Target) {
    'claude' {
        $SkillsRoot = Join-Path $env:USERPROFILE '.claude\skills'
    }
    'codex' {
        # 注:Codex 端需独立适配(.agents/ + openai.yaml),此处仅复制文件。
        if ($env:CODEX_HOME) {
            $SkillsRoot = Join-Path $env:CODEX_HOME 'skills'
        } else {
            $SkillsRoot = Join-Path $env:USERPROFILE '.codex\skills'
        }
    }
}

Write-Host "Career Skills Marketplace - loose install (fallback)"
Write-Host "推荐改用插件: /plugin marketplace add Jaydenlk/HR  然后  /plugin install career-principal@career-skills"
Write-Host "===================================="
Write-Host "Target: $SkillsRoot"
Write-Host ""

if (-not (Test-Path $SkillsRoot)) { New-Item -ItemType Directory -Path $SkillsRoot | Out-Null }

# Copy every subdir of skills/ (career-principal + 37 worker playbooks + _career-skills-shared).
foreach ($dir in (Get-ChildItem -Path (Join-Path $MarketplaceDir 'skills') -Directory)) {
    $dest = Join-Path $SkillsRoot $dir.Name
    if (Test-Path $dest) {
        Write-Host "ERROR: $dest already exists."
        Write-Host "This installer never deletes or overwrites. Remove it manually for a clean reinstall."
        exit 1
    }
    Copy-Item -Path $dir.FullName -Destination $dest -Recurse
    Write-Host "  OK $($dir.Name)/"
}

Write-Host ""
Write-Host "Installed to: $SkillsRoot"
Write-Host 'Next: open Claude Code and say "帮我看看我的简历" - 求职主理人(career-principal)会接管。'
