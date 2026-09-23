from pathlib import Path
import re

root = Path(__file__).parent
html_files = sorted(root.glob('*.html')) + sorted(root.glob('gestao/*.html')) + sorted(root.glob('gestão/*.html'))
missing = []
for html_path in html_files:
    text = html_path.read_text(encoding='utf-8')
    if 'prefers-reduced-motion' not in (root / 'style.css').read_text(encoding='utf-8'):
        raise AssertionError('missing reduced-motion support')
    for attr in re.findall(r'(?:src|href)="([^"]+)"', text):
        if attr.startswith(('http://', 'https://', '#', 'mailto:', 'tel:', 'data:')):
            continue
        clean = attr.split('?', 1)[0].split('#', 1)[0]
        if clean.endswith(('.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg')):
            target = (html_path.parent / clean).resolve()
            if not target.exists():
                missing.append(f'{html_path.relative_to(root)} -> {attr}')
    if '<img ' in text:
        for image in re.findall(r'<img\b[^>]*>', text, flags=re.I):
            if 'alt=' not in image:
                raise AssertionError(f'image without alt in {html_path}')
    if '<nav ' in text and 'aria-label=' not in text:
        raise AssertionError(f'navigation without label in {html_path}')
if missing:
    raise AssertionError('missing references: ' + ', '.join(missing))
css = (root / 'style.css').read_text(encoding='utf-8')
for forbidden in ['transition: all', 'animation: pulseGlow', 'animation: pulseGlow 3s infinite', '@keyframes pulseGlow']:
    if forbidden in css:
        raise AssertionError(f'forbidden CSS pattern: {forbidden}')
for required in ['--aurora-gradient:', 'prefers-reduced-motion', 'focus-visible', '--motion-fast']:
    if required not in css:
        raise AssertionError(f'missing CSS rule: {required}')
print(f'Validated {len(html_files)} HTML routes, assets, navigation labels, alt text, reduced motion and CSS motion rules.')
