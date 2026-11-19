const SVG_NS = 'http://www.w3.org/2000/svg';

const ICON_PATHS = {
  'clipboard-check': [
    { tag: 'rect', attrs: { x: '8', y: '2', width: '8', height: '4', rx: '1', ry: '1' } },
    { tag: 'path', attrs: { d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' } },
    { tag: 'path', attrs: { d: 'm9 14 2 2 4-4' } }
  ],
  sun: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '4' } },
    { tag: 'path', attrs: { d: 'M12 2v2' } },
    { tag: 'path', attrs: { d: 'M12 20v2' } },
    { tag: 'path', attrs: { d: 'm4.93 4.93 1.41 1.41' } },
    { tag: 'path', attrs: { d: 'm17.66 17.66 1.41 1.41' } },
    { tag: 'path', attrs: { d: 'M2 12h2' } },
    { tag: 'path', attrs: { d: 'M20 12h2' } },
    { tag: 'path', attrs: { d: 'm6.34 17.66-1.41 1.41' } },
    { tag: 'path', attrs: { d: 'm19.07 4.93-1.41 1.41' } }
  ],
  moon: [
    { tag: 'path', attrs: { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' } }
  ],
  settings: [
    { tag: 'path', attrs: { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' } },
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '3' } }
  ],
  eye: [
    { tag: 'path', attrs: { d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' } },
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '3' } }
  ],
  play: [
    { tag: 'polygon', attrs: { points: '6 3 20 12 6 21 6 3' } }
  ],
  search: [
    { tag: 'circle', attrs: { cx: '11', cy: '11', r: '8' } },
    { tag: 'path', attrs: { d: 'm21 21-4.3-4.3' } }
  ],
  download: [
    { tag: 'path', attrs: { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' } },
    { tag: 'polyline', attrs: { points: '7 10 12 15 17 10' } },
    { tag: 'line', attrs: { x1: '12', x2: '12', y1: '15', y2: '3' } }
  ],
  upload: [
    { tag: 'path', attrs: { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' } },
    { tag: 'polyline', attrs: { points: '17 8 12 3 7 8' } },
    { tag: 'line', attrs: { x1: '12', x2: '12', y1: '3', y2: '15' } }
  ],
  'rotate-ccw': [
    { tag: 'path', attrs: { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' } },
    { tag: 'path', attrs: { d: 'M3 3v5h5' } }
  ],
  plus: [
    { tag: 'path', attrs: { d: 'M5 12h14' } },
    { tag: 'path', attrs: { d: 'M12 5v14' } }
  ],
  scan: [
    { tag: 'path', attrs: { d: 'M3 7V5a2 2 0 0 1 2-2h2' } },
    { tag: 'path', attrs: { d: 'M17 3h2a2 2 0 0 1 2 2v2' } },
    { tag: 'path', attrs: { d: 'M21 17v2a2 2 0 0 1-2 2h-2' } },
    { tag: 'path', attrs: { d: 'M7 21H5a2 2 0 0 1-2-2v-2' } },
    { tag: 'path', attrs: { d: 'M7 12h10' } }
  ],
  swap: [
    { tag: 'path', attrs: { d: 'M8 3 4 7l4 4' } },
    { tag: 'path', attrs: { d: 'M4 7h16' } },
    { tag: 'path', attrs: { d: 'm16 21 4-4-4-4' } },
    { tag: 'path', attrs: { d: 'M20 17H4' } }
  ],
  'swap-vertical': [
    { tag: 'path', attrs: { d: 'm7 15 5 5 5-5' } },
    { tag: 'path', attrs: { d: 'M12 20V4' } },
    { tag: 'path', attrs: { d: 'm7 9 5-5 5 5' } }
  ],
  'cloud-download': [
    { tag: 'path', attrs: { d: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242' } },
    { tag: 'path', attrs: { d: 'M12 12v9' } },
    { tag: 'path', attrs: { d: 'm8 17 4 4 4-4' } }
  ],
  'cloud-upload': [
    { tag: 'path', attrs: { d: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242' } },
    { tag: 'path', attrs: { d: 'M12 12v9' } },
    { tag: 'path', attrs: { d: 'm16 16-4-4-4 4' } }
  ],
  'refresh-cw': [
    { tag: 'path', attrs: { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' } },
    { tag: 'path', attrs: { d: 'M21 3v5h-5' } },
    { tag: 'path', attrs: { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' } },
    { tag: 'path', attrs: { d: 'M3 21v-5h5' } }
  ],
  'check-circle': [
    { tag: 'path', attrs: { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' } },
    { tag: 'path', attrs: { d: 'm9 11 3 3L22 4' } }
  ],
  'alert-triangle': [
    { tag: 'path', attrs: { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' } },
    { tag: 'path', attrs: { d: 'M12 9v4' } },
    { tag: 'path', attrs: { d: 'M12 17h.01' } }
  ],
  info: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } },
    { tag: 'path', attrs: { d: 'M12 16v-4' } },
    { tag: 'path', attrs: { d: 'M12 8h.01' } }
  ],
  calendar: [
    { tag: 'rect', attrs: { width: '18', height: '18', x: '3', y: '4', rx: '2', ry: '2' } },
    { tag: 'line', attrs: { x1: '16', x2: '16', y1: '2', y2: '6' } },
    { tag: 'line', attrs: { x1: '8', x2: '8', y1: '2', y2: '6' } },
    { tag: 'line', attrs: { x1: '3', x2: '21', y1: '10', y2: '10' } }
  ],
  'external-link': [
    { tag: 'path', attrs: { d: 'M15 3h6v6' } },
    { tag: 'path', attrs: { d: 'M10 14 21 3' } },
    { tag: 'path', attrs: { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' } }
  ],
  lock: [
    { tag: 'rect', attrs: { width: '18', height: '11', x: '3', y: '11', rx: '2', ry: '2' } },
    { tag: 'path', attrs: { d: 'M7 11V7a5 5 0 0 1 10 0v4' } }
  ],
  trash: [
    { tag: 'path', attrs: { d: 'M3 6h18' } },
    { tag: 'path', attrs: { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' } },
    { tag: 'path', attrs: { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' } }
  ],
  x: [
    { tag: 'path', attrs: { d: 'M18 6 6 18' } },
    { tag: 'path', attrs: { d: 'm6 6 12 12' } }
  ],
  check: [
    { tag: 'path', attrs: { d: 'M20 6 9 17l-5-5' } }
  ],
  bug: [
    { tag: 'path', attrs: { d: 'm8 2 1.88 1.88' } },
    { tag: 'path', attrs: { d: 'M14.12 3.88 16 2' } },
    { tag: 'path', attrs: { d: 'M9 7.13v-1a3.003 3.003 0 1 1 6 0v1' } },
    { tag: 'path', attrs: { d: 'M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6' } },
    { tag: 'path', attrs: { d: 'M12 20v-9' } },
    { tag: 'path', attrs: { d: 'M6.53 9C4.6 8.8 3 7.1 3 5' } },
    { tag: 'path', attrs: { d: 'M6 13H2' } },
    { tag: 'path', attrs: { d: 'M3 21c0-2.1 1.7-3.9 3.8-4' } },
    { tag: 'path', attrs: { d: 'M20.97 5c0 2.1-1.6 3.8-3.5 4' } },
    { tag: 'path', attrs: { d: 'M22 13h-4' } },
    { tag: 'path', attrs: { d: 'M17.2 17c2.1.1 3.8 1.9 3.8 4' } }
  ]
};

export function createSvgIcon(name, size) {
  const iconSize = Number(size) || 16;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(iconSize));
  svg.setAttribute('height', String(iconSize));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('scr-icon');

  const shapes = ICON_PATHS[name] || [];
  for (const shape of shapes) {
    const el = document.createElementNS(SVG_NS, shape.tag);
    for (const [key, val] of Object.entries(shape.attrs)) {
      el.setAttribute(key, val);
    }
    svg.appendChild(el);
  }
  return svg;
}

export const renderIcon = createSvgIcon;

export function hydrateIcons(root) {
  const scope = root || document;
  const targets = scope.querySelectorAll('[data-icon]');
  for (const el of targets) {
    const name = el.getAttribute('data-icon');
    const size = Number(el.getAttribute('data-size')) || 16;
    if (!name) continue;
    el.replaceChildren(createSvgIcon(name, size));
  }
}
