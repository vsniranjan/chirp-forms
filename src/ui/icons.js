// Small local SVGs keep the interface available offline without an icon dependency.
const paths = {
  waves: ['M4 10v4m4-7v10m4-14v18m4-14v10m4-7v4'],
  broadcast: ['M12 12h.01', 'M8.5 8.5a5 5 0 0 0 0 7m7-7a5 5 0 0 1 0 7', 'M5 5a10 10 0 0 0 0 14m14-14a10 10 0 0 1 0 14'],
  library: ['M4 5h5v15H4zM12 5h4v15h-4zM18 5l3 14'],
  arrow: ['M5 12h14m-5-5 5 5-5 5'],
  back: ['m12 5-7 7 7 7m-7-7h14'],
  plus: ['M12 5v14M5 12h14'],
  edit: ['m16 3 5 5-12 12H4v-5L16 3zM13 6l5 5'],
  pin: ['M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z', 'M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  supplies: ['M4 7h16v14H4zM3 3h18v4H3zM9 11h6'],
  phone: ['M7 3H3c0 10 8 18 18 18v-4l-5-2-2 2a15 15 0 0 1-7-7l2-2-2-5Z'],
  note: ['M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6'],
  clock: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 2'],
  search: ['M19 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0m-2 5 5 5'],
  mic: ['M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Z', 'M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8'],
  stop: ['M6 6h12v12H6z'],
  check: ['m5 12 4 4L19 6'],
  settings: ['M4 7h16M4 17h16M8 4v6m8 4v6'],
  chevron: ['m9 5 7 7-7 7'],
  save: ['M5 3h12l4 4v14H3V3h2Zm2 0v6h9V3M7 21v-8h10v8'],
  shield: ['m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z', 'm8 12 3 3 5-6'],
};

export function icon(name, size = 20) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: 'ui-icon' })) {
    svg.setAttribute(key, value);
  }
  for (const d of paths[name] ?? paths.note) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
