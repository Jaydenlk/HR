<#
.SYNOPSIS
    T3 门A / TC-07:镜像 restricted 职业资产双扫描取证脚本。

.DESCRIPTION
    验证 data/occupations/restricted/** 与任何 *-restricted.csv 命名的文件
    在给定镜像里"两个维度"都不存在:
      1) 最终文件系统扫描 —— 镜像跑起来后容器内文件树是否含 restricted 资产
         (即使 .dockerignore 排除了 build-context,仍需实机核验 COPY 后的结果)。
      2) 历史 layer 扫描 —— docker save 导出镜像 tar,解出每一层 layer.tar,
         逐层 grep 文件名;因为哪怕最终文件系统干净,若某中间 layer 曾经写入过
         该文件、又被后续 layer 用 whiteout 删除,历史层的 tar 里资产内容依然
         存在、可被还原,必须一并排除。

    两道门任一命中 restricted 资产即判定失败(退出码 1)。全部通过退出码 0。
    临时目录固定在系统 TEMP 下,finally 只清理该临时目录,且清理前会核验路径确实位于系统 TEMP 内。

.PARAMETER Image
    要扫描的本地镜像 tag(必填),例如 coach-api:t3-gate-a。

.EXAMPLE
    ./scripts/scan-restricted-image.ps1 -Image coach-api:t3-gate-a
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Image
)

$ErrorActionPreference = 'Stop'

# restricted 资产的两种命名形态:新目录布局 + 旧命名兜底(与 .dockerignore 规则对齐)。
$restrictedPatterns = @('*-restricted.csv', '*/occupations/restricted/*')

$tempRoot = $null

try {
    # ── 门1:最终文件系统扫描 ────────────────────────────────────────────────
    # 用 find 的 -o 组合两种命中模式;/repo 是镜像内仓库根(见 Dockerfile.api WORKDIR)。
    Write-Host "== Gate 1: final filesystem scan =="
    $findExpr = "find /repo -type f \( -name '*-restricted.csv' -o -path '*/occupations/restricted/*' \) -print"
    $fsHits = & docker run --rm --entrypoint sh $Image -c $findExpr 2>&1
    $fsExitCode = $LASTEXITCODE

    if ($fsExitCode -ne 0) {
        Write-Host $fsHits
        throw "Gate 1: docker run failed with exit code $fsExitCode (see output above)."
    }

    $fsHitsTrimmed = ($fsHits | Where-Object { $_ -and $_.Trim() -ne '' })
    if ($fsHitsTrimmed) {
        Write-Host "FAIL: restricted assets found in final filesystem:"
        $fsHitsTrimmed | ForEach-Object { Write-Host "  $_" }
        exit 1
    }
    Write-Host "Gate 1 clean: no restricted assets in final filesystem."

    # ── 门2:历史 layer 扫描 ────────────────────────────────────────────────
    Write-Host "== Gate 2: historical layer scan =="

    $systemTemp = [System.IO.Path]::GetTempPath()
    if ([string]::IsNullOrWhiteSpace($systemTemp)) {
        throw "Gate 2: could not resolve a system temp directory (TEMP/TMP env vars empty)."
    }
    $tempRoot = Join-Path $systemTemp ("scan-restricted-image-" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

    $imageTar = Join-Path $tempRoot 'image.tar'
    $extractDir = Join-Path $tempRoot 'extracted'
    New-Item -ItemType Directory -Path $extractDir -Force | Out-Null

    docker image save $Image -o $imageTar
    if ($LASTEXITCODE -ne 0) {
        throw "Gate 2: docker image save failed with exit code $LASTEXITCODE."
    }

    tar -xf $imageTar -C $extractDir
    if ($LASTEXITCODE -ne 0) {
        throw "Gate 2: failed to extract image tar ($imageTar)."
    }

    $manifestPath = Join-Path $extractDir 'manifest.json'
    if (-not (Test-Path $manifestPath)) {
        throw "Gate 2: manifest.json not found in exported image tar — unexpected docker save format."
    }

    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    if (-not $manifest -or $manifest.Count -eq 0) {
        throw "Gate 2: manifest.json parsed empty — cannot enumerate layers."
    }

    $layerPaths = @()
    foreach ($entry in $manifest) {
        foreach ($layer in $entry.Layers) {
            $layerPaths += (Join-Path $extractDir $layer)
        }
    }
    $layerPaths = $layerPaths | Select-Object -Unique

    if ($layerPaths.Count -eq 0) {
        throw "Gate 2: no layers found in manifest.json — cannot verify image history."
    }

    $layerHits = @()
    foreach ($layerTar in $layerPaths) {
        if (-not (Test-Path $layerTar)) {
            throw "Gate 2: layer archive referenced in manifest not found on disk: $layerTar"
        }
        $entries = tar -tf $layerTar
        if ($LASTEXITCODE -ne 0) {
            throw "Gate 2: tar -tf failed on layer $layerTar (exit code $LASTEXITCODE)."
        }
        foreach ($line in $entries) {
            foreach ($pattern in $restrictedPatterns) {
                if ($line -like "*$pattern") {
                    $layerHits += "$layerTar : $line"
                }
            }
        }
    }
    $layerHits = $layerHits | Select-Object -Unique

    if ($layerHits.Count -gt 0) {
        Write-Host "FAIL: restricted assets found in historical image layers:"
        $layerHits | ForEach-Object { Write-Host "  $_" }
        exit 1
    }
    Write-Host "Gate 2 clean: no restricted assets in any image layer."

    Write-Host "PASS: no restricted occupation assets found in final filesystem or image layers"
    exit 0
}
finally {
    if ($tempRoot -and (Test-Path $tempRoot)) {
        $tempParent = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
        $tempRootFull = [System.IO.Path]::GetFullPath($tempRoot)
        if ($tempRootFull.StartsWith($tempParent, [System.StringComparison]::OrdinalIgnoreCase)) {
            Remove-Item -Recurse -Force -Path $tempRoot -ErrorAction SilentlyContinue
        }
    }
}
