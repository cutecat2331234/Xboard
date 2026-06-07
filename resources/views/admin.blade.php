<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{ $title }}</title>
  <script>
    window.settings = {
      base_url: "/",
      title: "{{ $title }}",
      version: "{{ $version }}",
      logo: "{{ $logo }}",
      secure_path: "{{ $secure_path }}",
    };
  </script>
  @php
    $manifestPath = public_path('assets/admin/manifest.json');
    $manifest = file_exists($manifestPath) ? json_decode(file_get_contents($manifestPath), true) : null;
    $entry = is_array($manifest) ? ($manifest['index.html'] ?? null) : null;
    $scripts = [];
    $styles = [];
    $locales = [];

    if (is_array($entry)) {
      $visited = [];
      $collectAssets = function ($chunkName) use (&$collectAssets, &$manifest, &$visited, &$scripts, &$styles) {
        if (isset($visited[$chunkName]) || !isset($manifest[$chunkName]) || !is_array($manifest[$chunkName])) {
          return;
        }

        $visited[$chunkName] = true;
        $chunk = $manifest[$chunkName];

        if (!empty($chunk['css']) && is_array($chunk['css'])) {
          foreach ($chunk['css'] as $cssFile) {
            $styles[$cssFile] = $cssFile;
          }
        }

        if (!empty($chunk['imports']) && is_array($chunk['imports'])) {
          foreach ($chunk['imports'] as $import) {
            $collectAssets($import);
          }
        }

        if (!empty($chunk['isEntry']) && !empty($chunk['file'])) {
          $scripts[$chunk['file']] = $chunk['file'];
        }
      };

      $collectAssets('index.html');
    }

    foreach (glob(public_path('assets/admin/locales/*.js')) ?: [] as $localeFile) {
      $locales[] = 'locales/' . basename($localeFile);
    }
    sort($locales);
  @endphp

  @if($entry && count($scripts) > 0)
    @foreach($styles as $css)
      <link rel="stylesheet" crossorigin href="/assets/admin/{{ $css }}" />
    @endforeach
    @foreach($locales as $locale)
      <script src="/assets/admin/{{ $locale }}"></script>
    @endforeach
    @foreach($scripts as $js)
      <script type="module" crossorigin src="/assets/admin/{{ $js }}"></script>
    @endforeach
  @else
    {{-- Fallback: hardcoded paths for backward compatibility --}}
    <script type="module" crossorigin src="/assets/admin/assets/index.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/admin/assets/index.css" />
    <link rel="stylesheet" crossorigin href="/assets/admin/assets/vendor.css">
    <script src="/assets/admin/locales/en-US.js"></script>
    <script src="/assets/admin/locales/zh-CN.js"></script>
    <script src="/assets/admin/locales/ko-KR.js"></script>
  @endif

  {{-- Fix admin dialogs using monospace font for labels/inputs (upstream UI bug) --}}
  <style id="xboard-dialog-font-fix">
    [role="dialog"],
    [role="alertdialog"] {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
        "Noto Sans SC", "Helvetica Neue", Arial, sans-serif !important;
    }
    [role="dialog"] label,
    [role="dialog"] input,
    [role="dialog"] textarea,
    [role="dialog"] select,
    [role="dialog"] button,
    [role="dialog"] h1,
    [role="dialog"] h2,
    [role="dialog"] h3,
    [role="dialog"] h4,
    [role="dialog"] p,
    [role="dialog"] span,
    [role="dialog"] div,
    [role="alertdialog"] label,
    [role="alertdialog"] input,
    [role="alertdialog"] textarea,
    [role="alertdialog"] button,
    [role="alertdialog"] h1,
    [role="alertdialog"] h2,
    [role="alertdialog"] p {
      font-family: inherit !important;
    }
    [role="dialog"] .monaco-editor,
    [role="dialog"] .monaco-editor *,
    [role="dialog"] pre,
    [role="dialog"] code {
      font-family: var(--monaco-monospace-font, ui-monospace), SFMono-Regular, Menlo,
        Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
    }
  </style>
</head>

<body>
  <div id="root"></div>
</body>

</html>
