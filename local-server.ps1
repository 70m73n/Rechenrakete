$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, 8080)
$listener.Start()

while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
        $stream = $client.GetStream()
        $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 8192, $true)
        $requestLine = $reader.ReadLine()
        while (($line = $reader.ReadLine()) -ne $null -and $line.Length -gt 0) { }

        if ($requestLine -notmatch '^(GET|HEAD)\s+([^\s]+)') { continue }

        $method = $Matches[1]
        $requestPath = [System.Uri]::UnescapeDataString($Matches[2].Split('?')[0])
        if ($requestPath -eq '/') { $requestPath = '/index.html' }

        $relativePath = $requestPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))

        if (-not $filePath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
            $status = '404 Not Found'
            $contentType = 'text/plain; charset=utf-8'
            $body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
        } else {
            $status = '200 OK'
            $body = [System.IO.File]::ReadAllBytes($filePath)
            $contentType = switch ([System.IO.Path]::GetExtension($filePath).ToLowerInvariant()) {
                '.html' { 'text/html; charset=utf-8' }
                '.css' { 'text/css; charset=utf-8' }
                '.js' { 'application/javascript; charset=utf-8' }
                '.json' { 'application/json; charset=utf-8' }
                '.svg' { 'image/svg+xml' }
                '.png' { 'image/png' }
                '.jpg' { 'image/jpeg' }
                '.jpeg' { 'image/jpeg' }
                '.ico' { 'image/x-icon' }
                default { 'application/octet-stream' }
            }
        }

        $header = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        if ($method -eq 'GET') { $stream.Write($body, 0, $body.Length) }
    } catch {
        # A failed client connection should not stop the server.
    } finally {
        if ($client) { $client.Close() }
    }
}
