# 연차관리 시스템 웹 서버
$port = 8000
$url = "http://localhost:$port/"

# HTTP 리스너 생성
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
$listener.Start()

Write-Host "연차관리 시스템 서버가 $url 에서 실행 중입니다..."
Write-Host "종료하려면 Ctrl+C를 누르세요."

# MIME 타입 매핑
$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css' = 'text/css'
    '.js' = 'application/javascript'
    '.json' = 'application/json'
    '.png' = 'image/png'
    '.jpg' = 'image/jpeg'
    '.gif' = 'image/gif'
    '.ico' = 'image/x-icon'
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") {
            $localPath = "/index.html"
        }
        
        $filePath = Join-Path (Get-Location) $localPath.TrimStart('/')
        
        if (Test-Path $filePath) {
            $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mimeType = $mimeTypes[$extension]
            
            if ($mimeType) {
                $response.ContentType = $mimeType
            }
            
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
            $errorMessage = "File not found: $localPath"
            $errorBytes = [System.Text.Encoding]::UTF8.GetBytes($errorMessage)
            $response.ContentLength64 = $errorBytes.Length
            $response.OutputStream.Write($errorBytes, 0, $errorBytes.Length)
        }
        
        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
    Write-Host "서버를 종료합니다."
}
