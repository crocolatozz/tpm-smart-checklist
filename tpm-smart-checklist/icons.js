const SVG_NS = 'http://www.w3.org/2000/svg';

const ICON_PATHS = {
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
  'swap-vertical': [
    { tag: 'line', attrs: { x1: '7', y1: '19', x2: '7', y2: '5' } },
    { tag: 'polyline', attrs: { points: '3.5 8.5 7 5 10.5 8.5' } },
    { tag: 'line', attrs: { x1: '17', y1: '5', x2: '17', y2: '19' } },
    { tag: 'polyline', attrs: { points: '13.5 15.5 17 19 20.5 15.5' } }
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
  x: [
    { tag: 'path', attrs: { d: 'M18 6 6 18' } },
    { tag: 'path', attrs: { d: 'm6 6 12 12' } }
  ],
  code: [
    { tag: 'polyline', attrs: { points: '7 8 3 12 7 16' } },
    { tag: 'line', attrs: { x1: '14', y1: '6', x2: '10', y2: '18' } },
    { tag: 'polyline', attrs: { points: '17 8 21 12 17 16' } }
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
