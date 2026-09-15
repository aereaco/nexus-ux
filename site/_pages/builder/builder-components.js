// Nexus Builder Component Registry & Dynamic Property Schema Engine
// 1:1 Parity with VvvebJs Dynamic Component Property Architecture mapped to DaisyUI 5 & Tailwind CSS
(function() {
  'use strict';

  function safeClasses(el) {
    return el && el.className && typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean) : [];
  }

  function getTag(el) {
    return el && el.tagName ? el.tagName.toLowerCase() : '';
  }

  // Wave Separators Database (VvvebJs Parity)
  const WAVE_SHAPES = {
    'wave-smooth': {
      name: 'Smooth Wave',
      svg: '<svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="w-full h-12 fill-current"><path d="M0,0 C150,90 350,-40 500,60 C650,160 900,10 1200,40 L1200,120 L0,120 Z"></path></svg>'
    },
    'wave-curved': {
      name: 'Curved Sweep',
      svg: '<svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="w-full h-12 fill-current"><path d="M0,0 C300,120 600,0 900,100 C1050,150 1150,80 1200,60 L1200,120 L0,120 Z"></path></svg>'
    },
    'wave-hills': {
      name: 'Twin Peaks',
      svg: '<svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="w-full h-12 fill-current"><path d="M0,60 C200,120 400,0 600,60 C800,120 1000,0 1200,60 L1200,120 L0,120 Z"></path></svg>'
    },
    'wave-slant': {
      name: 'Diagonal Slant',
      svg: '<svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="w-full h-12 fill-current"><polygon points="0,120 1200,30 1200,120"></polygon></svg>'
    },
    'wave-triangle': {
      name: 'Center Peak',
      svg: '<svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="w-full h-12 fill-current"><polygon points="0,120 600,20 1200,120"></polygon></svg>'
    },
    'wave-steps': {
      name: 'Multi-Crest',
      svg: '<svg viewBox="0 0 1200 120" preserveAspectRatio="none" class="w-full h-12 fill-current"><path d="M0,40 Q300,120 600,40 T1200,40 L1200,120 L0,120 Z"></path></svg>'
    }
  };

  // SVG Icons Database (VvvebJs Parity)
  const ICON_SHAPES = {
    'star': {
      name: 'Star',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
    },
    'heart': {
      name: 'Heart',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'
    },
    'check': {
      name: 'Check',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    },
    'arrow': {
      name: 'Arrow Right',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>'
    },
    'home': {
      name: 'Home',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>'
    },
    'user': {
      name: 'User',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
    },
    'settings': {
      name: 'Settings',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>'
    },
    'shield': {
      name: 'Shield',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'
    },
    'zap': {
      name: 'Zap / Flash',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'
    },
    'bell': {
      name: 'Bell',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>'
    },
    'code': {
      name: 'Code',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>'
    },
    'search': {
      name: 'Search',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
    }
  };

  // Base General Section Generator (_base parity)
  function getBaseGeneralProps(el) {
    const cls = safeClasses(el);
    return [
      {
        key: 'id',
        name: 'Element ID',
        section: 'general',
        type: 'text',
        htmlAttr: 'id',
        value: el.getAttribute('id') || ''
      },
      {
        key: 'title',
        name: 'Title Tooltip',
        section: 'general',
        type: 'text',
        htmlAttr: 'title',
        value: el.getAttribute('title') || ''
      },
      {
        key: 'classes',
        name: 'Applied Classes',
        section: 'general',
        type: 'tags',
        value: cls,
        onChange: function(node, val) {
          node.className = Array.isArray(val) ? val.join(' ') : val;
        }
      }
    ];
  }

  const Registry = {
    components: [],
    waveShapes: WAVE_SHAPES,
    iconShapes: ICON_SHAPES,

    register: function(comp) {
      this.components.push(comp);
    },

    matchNode: function(el) {
      if (!el || el.nodeType !== 1) return this.getDefaultComponent(el);
      for (let i = 0; i < this.components.length; i++) {
        const comp = this.components[i];
        if (comp.match && comp.match(el)) {
          return comp;
        }
      }
      return this.getDefaultComponent(el);
    },

    getDefaultComponent: function(el) {
      const tag = getTag(el);
      const isText = el && el.children && el.children.length === 0 && el.textContent.trim().length > 0;
      return {
        id: isText ? 'element-text' : 'element-generic',
        name: isText ? 'Text Element' : (tag.toUpperCase() || 'Element'),
        category: 'Element',
        getSections: function() {
          return [
            { id: 'default', header: isText ? 'Text Element' : 'Element' },
            { id: 'general', header: 'General' }
          ];
        },
        getProperties: function(target) {
          const props = [];
          if (isText) {
            props.push({
              key: 'textContent',
              name: 'Text Content',
              section: 'default',
              type: 'textarea',
              value: target.textContent || '',
              onChange: function(node, val) { node.textContent = val; }
            });
          }
          return props.concat(getBaseGeneralProps(target));
        }
      };
    },

    applyProperty: function(el, prop, value) {
      if (!el || !prop) return;
      if (typeof prop.onChange === 'function') {
        prop.onChange(el, value);
      } else if (prop.htmlAttr === 'class' && prop.validValues) {
        prop.validValues.forEach(function(v) { if (v) el.classList.remove(v); });
        if (value && value !== 'none') {
          value.split(/\s+/).forEach(function(c) { if (c) el.classList.add(c); });
        }
      } else if (prop.htmlAttr === 'style') {
        el.style[prop.key] = value;
      } else if (prop.htmlAttr === 'innerText') {
        el.innerText = value;
      } else if (prop.htmlAttr === 'innerHTML') {
        el.innerHTML = value;
      } else if (prop.htmlAttr) {
        if (value === null || value === '' || value === false) {
          el.removeAttribute(prop.htmlAttr);
        } else {
          el.setAttribute(prop.htmlAttr, value === true ? '' : value);
        }
      }
    }
  };

  // ==========================================
  // 1. SECTION & HERO ARCHETYPE (section.js 1:1)
  // ==========================================
  Registry.register({
    id: 'section',
    name: 'Section Shell',
    category: 'Layout & Containers',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'section' || cls.includes('hero') || (tag === 'header' && cls.includes('section'));
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Section Layout' },
        { id: 'background', header: 'Background Media' },
        { id: 'overlay', header: 'Color Overlay' },
        { id: 'separators', header: 'Wave Separators' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const bgCont = el.querySelector(':scope > .background-container');
      let currentBg = 'none';
      let bgImgSrc = '';
      let bgVidSrc = '';
      let bgYtSrc = '';
      let hasParallax = false;

      if (bgCont) {
        hasParallax = bgCont.classList.contains('parallax');
        const img = bgCont.querySelector('img');
        const vid = bgCont.querySelector('video');
        const ifr = bgCont.querySelector('iframe');
        if (vid && !vid.classList.contains('hidden')) { currentBg = 'bg-video'; bgVidSrc = vid.getAttribute('src') || ''; }
        else if (ifr && !ifr.classList.contains('hidden')) { currentBg = 'bg-yt'; bgYtSrc = ifr.getAttribute('src') || ''; }
        else if (img && !img.classList.contains('hidden')) { currentBg = 'bg-image'; bgImgSrc = img.getAttribute('src') || ''; }
      }

      const overlayEl = el.querySelector(':scope > .section-overlay, :scope > .overlay');
      const hasOverlay = !!overlayEl && !overlayEl.classList.contains('hidden');
      const overlayColor = overlayEl ? (overlayEl.style.backgroundColor || '#000000') : '#000000';
      const overlayOpacity = overlayEl ? (overlayEl.style.opacity || '0.6') : '0.6';

      const topSepEl = el.querySelector(':scope > .separator.top');
      const hasTopSep = !!topSepEl && !topSepEl.classList.contains('hidden');
      const botSepEl = el.querySelector(':scope > .separator.bottom');
      const hasBotSep = !!botSepEl && !botSepEl.classList.contains('hidden');

      const props = [
        // Default Section
        {
          key: 'label',
          name: 'Section Label',
          section: 'default',
          type: 'text',
          htmlAttr: 'aria-label',
          value: el.getAttribute('aria-label') || el.id || ''
        },
        {
          key: 'container-width',
          name: 'Container Width',
          section: 'default',
          type: 'buttons',
          value: cls.includes('w-full') ? 'full' : 'boxed',
          options: [
            { label: 'Boxed', value: 'boxed' },
            { label: 'Full Width', value: 'full' }
          ],
          onChange: function(node, val) {
            if (val === 'full') {
              node.classList.add('w-full');
              node.classList.remove('container');
            } else {
              node.classList.remove('w-full');
              node.classList.add('container');
            }
          }
        },
        {
          key: 'container-height',
          name: 'Container Height',
          section: 'default',
          type: 'buttons',
          value: cls.includes('min-h-screen') ? 'full' : 'auto',
          options: [
            { label: 'Auto', value: 'auto' },
            { label: 'Screen Full', value: 'full' }
          ],
          onChange: function(node, val) {
            if (val === 'full') node.classList.add('min-h-screen');
            else node.classList.remove('min-h-screen');
          }
        },
        {
          key: 'paddingY',
          name: 'Vertical Padding',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['py-8', 'py-12', 'py-16', 'py-20', 'py-24', 'py-32'],
          value: ['py-8', 'py-12', 'py-16', 'py-20', 'py-24', 'py-32'].find(p => cls.includes(p)) || 'py-16',
          options: [
            { label: 'Small (32px)', value: 'py-8' },
            { label: 'Medium (64px)', value: 'py-16' },
            { label: 'Large (96px)', value: 'py-24' },
            { label: 'Hero (128px)', value: 'py-32' }
          ]
        },

        // Background Section (4-Mode Selector + Groups)
        {
          key: 'section-bg',
          name: 'Background Mode',
          section: 'background',
          type: 'buttons',
          value: currentBg,
          refreshes: true,
          options: [
            { label: 'None', value: 'none' },
            { label: 'Image', value: 'bg-image' },
            { label: 'Video', value: 'bg-video' },
            { label: 'YouTube', value: 'bg-yt' }
          ],
          onChange: function(node, val) {
            let container = node.querySelector(':scope > .background-container');
            if (!container) {
              container = document.createElement('div');
              container.className = 'background-container absolute inset-0 -z-10 overflow-hidden pointer-events-none';
              node.style.position = 'relative';
              node.insertBefore(container, node.firstChild);
            }
            container.querySelectorAll(':scope > *').forEach(e => e.classList.add('hidden'));

            if (val === 'bg-image') {
              let img = container.querySelector('img');
              if (!img) {
                img = document.createElement('img');
                img.className = 'w-full h-full object-cover';
                img.src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&q=80';
                container.appendChild(img);
              }
              img.classList.remove('hidden');
            } else if (val === 'bg-video') {
              let vid = container.querySelector('video');
              if (!vid) {
                vid = document.createElement('video');
                vid.className = 'w-full h-full object-cover';
                vid.autoplay = true; vid.loop = true; vid.muted = true; vid.playsInline = true;
                vid.src = 'https://www.w3schools.com/html/mov_bbb.mp4';
                container.appendChild(vid);
              }
              vid.classList.remove('hidden');
            } else if (val === 'bg-yt') {
              let ifr = container.querySelector('iframe');
              if (!ifr) {
                ifr = document.createElement('iframe');
                ifr.className = 'w-full h-full pointer-events-none scale-125';
                ifr.src = 'https://www.youtube.com/embed/C6fOoy7Se_4?autoplay=1&loop=1&playsinline=1&controls=0&mute=1';
                container.appendChild(ifr);
              }
              ifr.classList.remove('hidden');
            }
          }
        },
        {
          key: 'bg-image-src',
          name: 'Image Source URL',
          section: 'background',
          group: 'bg-image',
          type: 'image',
          value: bgImgSrc || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&q=80',
          onChange: function(node, val) {
            const img = node.querySelector(':scope > .background-container > img');
            if (img) img.src = val;
          }
        },
        {
          key: 'bg-image-parallax',
          name: 'Parallax Effect',
          section: 'background',
          group: 'bg-image',
          type: 'toggle',
          value: hasParallax,
          onChange: function(node, val) {
            const c = node.querySelector(':scope > .background-container');
            if (c) {
              if (val) c.classList.add('parallax', 'bg-fixed');
              else c.classList.remove('parallax', 'bg-fixed');
            }
          }
        },
        {
          key: 'bg-video-src',
          name: 'Video Source URL',
          section: 'background',
          group: 'bg-video',
          type: 'text',
          value: bgVidSrc,
          onChange: function(node, val) {
            const vid = node.querySelector(':scope > .background-container > video');
            if (vid) vid.src = val;
          }
        },
        {
          key: 'bg-yt-src',
          name: 'YouTube Embed URL',
          section: 'background',
          group: 'bg-yt',
          type: 'text',
          value: bgYtSrc,
          onChange: function(node, val) {
            const ifr = node.querySelector(':scope > .background-container > iframe');
            if (ifr) ifr.src = val;
          }
        },

        // Overlay Section
        {
          key: 'overlay',
          name: 'Enable Color Overlay',
          section: 'overlay',
          type: 'toggle',
          value: hasOverlay,
          refreshes: true,
          onChange: function(node, val) {
            let o = node.querySelector(':scope > .section-overlay, :scope > .overlay');
            if (val) {
              if (!o) {
                o = document.createElement('div');
                o.className = 'section-overlay overlay absolute inset-0 -z-5 pointer-events-none';
                o.style.backgroundColor = 'rgba(0,0,0,0.6)';
                o.style.opacity = '0.6';
                node.style.position = 'relative';
                node.insertBefore(o, node.firstChild);
              } else {
                o.classList.remove('hidden');
              }
            } else if (o) {
              o.classList.add('hidden');
            }
          }
        },
        {
          key: 'overlay-color',
          name: 'Overlay Color',
          section: 'overlay',
          group: 'overlay',
          type: 'color',
          value: overlayColor,
          onChange: function(node, val) {
            const o = node.querySelector(':scope > .section-overlay, :scope > .overlay');
            if (o) o.style.backgroundColor = val;
          }
        },
        {
          key: 'overlay-opacity',
          name: 'Overlay Opacity',
          section: 'overlay',
          group: 'overlay',
          type: 'range',
          min: 0,
          max: 1,
          step: 0.1,
          value: overlayOpacity,
          onChange: function(node, val) {
            const o = node.querySelector(':scope > .section-overlay, :scope > .overlay');
            if (o) o.style.opacity = val;
          }
        },

        // Wave Separators Section
        {
          key: 'top_separator',
          name: 'Top Wave Separator',
          section: 'separators',
          type: 'toggle',
          value: hasTopSep,
          refreshes: true,
          onChange: function(node, val) {
            let s = node.querySelector(':scope > .separator.top');
            if (val) {
              if (!s) {
                s = document.createElement('div');
                s.className = 'separator top absolute top-0 left-0 right-0 w-full overflow-hidden leading-none -z-5 rotate-180';
                s.innerHTML = WAVE_SHAPES['wave-smooth'].svg;
                node.style.position = 'relative';
                node.appendChild(s);
              } else s.classList.remove('hidden');
            } else if (s) s.classList.add('hidden');
          }
        },
        {
          key: 'top_separator_shape',
          name: 'Top Wave Silhouette',
          section: 'separators',
          group: 'top_separator',
          type: 'wave-gallery',
          value: 'wave-smooth',
          onChange: function(node, val) {
            const s = node.querySelector(':scope > .separator.top');
            if (s && WAVE_SHAPES[val]) s.innerHTML = WAVE_SHAPES[val].svg;
          }
        },
        {
          key: 'bottom_separator',
          name: 'Bottom Wave Separator',
          section: 'separators',
          type: 'toggle',
          value: hasBotSep,
          refreshes: true,
          onChange: function(node, val) {
            let s = node.querySelector(':scope > .separator.bottom');
            if (val) {
              if (!s) {
                s = document.createElement('div');
                s.className = 'separator bottom absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none -z-5';
                s.innerHTML = WAVE_SHAPES['wave-smooth'].svg;
                node.style.position = 'relative';
                node.appendChild(s);
              } else s.classList.remove('hidden');
            } else if (s) s.classList.add('hidden');
          }
        },
        {
          key: 'bottom_separator_shape',
          name: 'Bottom Wave Silhouette',
          section: 'separators',
          group: 'bottom_separator',
          type: 'wave-gallery',
          value: 'wave-smooth',
          onChange: function(node, val) {
            const s = node.querySelector(':scope > .separator.bottom');
            if (s && WAVE_SHAPES[val]) s.innerHTML = WAVE_SHAPES[val].svg;
          }
        }
      ];

      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 2. GRID ROW ARCHETYPE (components-bootstrap5.js 1:1)
  // ==========================================
  Registry.register({
    id: 'gridrow',
    name: 'Grid Row',
    category: 'Layout & Containers',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('grid') || cls.includes('row') || cls.some(c => c.startsWith('grid-cols-'));
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Grid & Flex Alignment' },
        { id: 'columns', header: 'Child Columns' },
        { id: 'general', header: 'General' }
      ];
    },
    beforeInit: function(node) {
      // Dynamic column scan
      const cols = Array.from(node.querySelectorAll(':scope > [class*="col-"], :scope > .col, :scope > div'));
      node.__grid_columns = cols.map((col, i) => {
        const cCls = safeClasses(col);
        return {
          index: i,
          name: 'Column ' + (i + 1),
          el: col,
          xs: (cCls.find(c => c.startsWith('col-span-')) || '').replace('col-span-', '') || '12',
          md: (cCls.find(c => c.startsWith('md:col-span-')) || '').replace('md:col-span-', '') || '4'
        };
      });
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const cols = el.__grid_columns || [];

      const props = [
        {
          key: 'direction',
          name: 'Flex Direction',
          section: 'default',
          type: 'buttons',
          value: cls.includes('flex-col-reverse') ? 'flex-col-reverse' : (cls.includes('flex-col') ? 'flex-col' : (cls.includes('flex-row-reverse') ? 'flex-row-reverse' : 'flex-row')),
          options: [
            { label: 'Row (→)', value: 'flex-row' },
            { label: 'Col (↓)', value: 'flex-col' },
            { label: 'Row Rev (←)', value: 'flex-row-reverse' },
            { label: 'Col Rev (↑)', value: 'flex-col-reverse' }
          ],
          htmlAttr: 'class',
          validValues: ['flex-row', 'flex-row-reverse', 'flex-col', 'flex-col-reverse']
        },
        {
          key: 'vertical-align',
          name: 'Vertical Align',
          section: 'default',
          type: 'buttons',
          value: ['items-start', 'items-center', 'items-end', 'items-stretch'].find(a => cls.includes(a)) || 'items-center',
          options: [
            { label: 'Top', value: 'items-start' },
            { label: 'Center', value: 'items-center' },
            { label: 'Bottom', value: 'items-end' },
            { label: 'Stretch', value: 'items-stretch' }
          ],
          htmlAttr: 'class',
          validValues: ['items-start', 'items-center', 'items-end', 'items-stretch']
        },
        {
          key: 'horizontal-align',
          name: 'Horizontal Align',
          section: 'default',
          type: 'buttons',
          value: ['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around'].find(j => cls.includes(j)) || 'justify-start',
          options: [
            { label: 'Start', value: 'justify-start' },
            { label: 'Center', value: 'justify-center' },
            { label: 'End', value: 'justify-end' },
            { label: 'Between', value: 'justify-between' }
          ],
          htmlAttr: 'class',
          validValues: ['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around']
        },
        {
          key: 'wrap',
          name: 'Flex Wrap',
          section: 'default',
          type: 'buttons',
          value: cls.includes('flex-nowrap') ? 'flex-nowrap' : 'flex-wrap',
          options: [
            { label: 'Wrap', value: 'flex-wrap' },
            { label: 'No Wrap', value: 'flex-nowrap' }
          ],
          htmlAttr: 'class',
          validValues: ['flex-wrap', 'flex-nowrap']
        },
        {
          key: 'columns-manager',
          name: 'Column Layout & Breakpoints',
          section: 'columns',
          type: 'columns-manager',
          value: cols,
          onRemoveColumn: function(node, index) {
            const cols = Array.from(node.querySelectorAll(':scope > [class*="col-"], :scope > .col, :scope > div'));
            if (cols[index]) cols[index].remove();
          },
          onAddColumn: function(node) {
            const newCol = document.createElement('div');
            newCol.className = 'col-span-12 md:col-span-4 p-4 border border-dashed border-base-content/20 rounded-xl';
            newCol.textContent = 'New Column';
            node.appendChild(newCol);
          },
          onSpanChange: function(node, index, bp, span) {
            const cols = Array.from(node.querySelectorAll(':scope > [class*="col-"], :scope > .col, :scope > div'));
            const col = cols[index];
            if (!col) return;
            const prefix = bp === 'xs' ? 'col-span-' : `${bp}:col-span-`;
            // Remove previous
            col.className = col.className.split(/\s+/).filter(c => !c.startsWith(prefix)).join(' ');
            if (span && span !== 'none') {
              col.classList.add(`${prefix}${span}`);
            }
          }
        }
      ];

      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 3. SVG IMAGE / ICON ARCHETYPE (components-elements.js 1:1)
  // ==========================================
  Registry.register({
    id: 'svg-icon',
    name: 'SVG Vector Icon',
    category: 'Cards & Media',
    match: function(el) {
      const tag = getTag(el);
      return tag === 'svg' || tag === 'iconify-icon' || safeClasses(el).includes('svg-image');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Icon Shape & Size' },
        { id: 'colors', header: 'SVG Color Palettes' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const width = el.getAttribute('width') || '32';
      const height = el.getAttribute('height') || '32';
      const strokeWidth = el.getAttribute('stroke-width') || '2';
      const fill = el.getAttribute('fill') || 'none';
      const stroke = el.getAttribute('stroke') || 'currentColor';

      const props = [
        {
          key: 'icon-shape',
          name: 'Vector Shape Palette',
          section: 'default',
          type: 'svg-gallery',
          value: 'star',
          onChange: function(node, val) {
            if (ICON_SHAPES[val]) {
              const temp = document.createElement('div');
              temp.innerHTML = ICON_SHAPES[val].svg;
              const newSvg = temp.firstElementChild;
              if (newSvg) {
                while (node.firstChild) node.removeChild(node.firstChild);
                Array.from(newSvg.childNodes).forEach(child => node.appendChild(child.cloneNode(true)));
                node.setAttribute('viewBox', newSvg.getAttribute('viewBox') || '0 0 24 24');
                node.setAttribute('fill', newSvg.getAttribute('fill') || 'none');
                node.setAttribute('stroke', newSvg.getAttribute('stroke') || 'currentColor');
              }
            }
          }
        },
        {
          key: 'width',
          name: 'Icon Width (px)',
          section: 'default',
          type: 'range',
          min: 12,
          max: 256,
          step: 2,
          value: parseInt(width) || 32,
          htmlAttr: 'width'
        },
        {
          key: 'height',
          name: 'Icon Height (px)',
          section: 'default',
          type: 'range',
          min: 12,
          max: 256,
          step: 2,
          value: parseInt(height) || 32,
          htmlAttr: 'height'
        },
        {
          key: 'stroke-width',
          name: 'Stroke Width',
          section: 'default',
          type: 'range',
          min: 1,
          max: 8,
          step: 1,
          value: parseInt(strokeWidth) || 2,
          htmlAttr: 'stroke-width'
        },
        {
          key: 'rawCode',
          name: 'Raw SVG Markup',
          section: 'default',
          type: 'textarea',
          value: el.outerHTML,
          onChange: function(node, val) {
            const temp = document.createElement('div');
            temp.innerHTML = val;
            if (temp.firstElementChild) node.replaceWith(temp.firstElementChild);
          }
        },
        // Color Section
        {
          key: 'stroke',
          name: 'Stroke Color',
          section: 'colors',
          type: 'color',
          htmlAttr: 'stroke',
          value: stroke
        },
        {
          key: 'fill',
          name: 'Fill Color',
          section: 'colors',
          type: 'color',
          htmlAttr: 'fill',
          value: fill
        }
      ];

      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 4. IMAGE ARCHETYPE (components-common.js 1:1)
  // ==========================================
  Registry.register({
    id: 'img',
    name: 'Image',
    category: 'Cards & Media',
    match: function(el) {
      return getTag(el) === 'img';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Image Source & Alignment' },
        { id: 'link', header: 'Hyperlink Action' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const parentLink = el.closest('a');
      const hasLink = !!parentLink;

      const props = [
        {
          key: 'src',
          name: 'Image Source URL',
          section: 'default',
          type: 'image',
          htmlAttr: 'src',
          value: el.getAttribute('src') || ''
        },
        {
          key: 'alt',
          name: 'Alt Text',
          section: 'default',
          type: 'text',
          htmlAttr: 'alt',
          value: el.getAttribute('alt') || ''
        },
        {
          key: 'align',
          name: 'Image Alignment',
          section: 'default',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['mx-0', 'mx-auto', 'ml-auto', 'float-left', 'float-right'],
          value: cls.includes('mx-auto') ? 'mx-auto' : (cls.includes('float-right') ? 'float-right' : 'mx-0'),
          options: [
            { label: 'Left', value: 'mx-0' },
            { label: 'Center', value: 'mx-auto' },
            { label: 'Right', value: 'float-right' }
          ]
        },
        {
          key: 'radius',
          name: 'Corner Radius',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['rounded-none', 'rounded-md', 'rounded-xl', 'rounded-2xl', 'rounded-full'],
          value: ['rounded-none', 'rounded-md', 'rounded-xl', 'rounded-2xl', 'rounded-full'].find(r => cls.includes(r)) || 'rounded-xl',
          options: [
            { label: 'None', value: 'rounded-none' },
            { label: 'Medium', value: 'rounded-md' },
            { label: 'Large (XL)', value: 'rounded-xl' },
            { label: 'Pill / Circle', value: 'rounded-full' }
          ]
        },

        // Link Section
        {
          key: 'hasLink',
          name: 'Enable Hyperlink',
          section: 'link',
          type: 'toggle',
          value: hasLink,
          refreshes: true,
          onChange: function(node, val) {
            if (val && !node.closest('a')) {
              const a = document.createElement('a');
              a.href = '#';
              node.replaceWith(a);
              a.appendChild(node);
            } else if (!val && node.closest('a')) {
              const a = node.closest('a');
              a.replaceWith(node);
            }
          }
        },
        {
          key: 'linkHref',
          name: 'Link Target URL',
          section: 'link',
          group: 'hasLink',
          type: 'text',
          value: parentLink ? (parentLink.getAttribute('href') || '') : '',
          onChange: function(node, val) {
            const a = node.closest('a');
            if (a) a.setAttribute('href', val);
          }
        },
        {
          key: 'linkTarget',
          name: 'Open In',
          section: 'link',
          group: 'hasLink',
          type: 'buttons',
          value: parentLink ? (parentLink.getAttribute('target') || '_self') : '_self',
          options: [
            { label: 'Same Window', value: '_self' },
            { label: 'New Tab', value: '_blank' }
          ],
          onChange: function(node, val) {
            const a = node.closest('a');
            if (a) a.setAttribute('target', val);
          }
        }
      ];

      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 5. BUTTON ARCHETYPE (components-bootstrap5.js 1:1)
  // ==========================================
  Registry.register({
    id: 'btn',
    name: 'Button',
    category: 'Buttons & Actions',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return (tag === 'button' || (tag === 'a' && cls.includes('btn')) || cls.includes('btn')) && !cls.includes('btn-group');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Button Style & Text' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const tag = getTag(el);
      const props = [
        {
          key: 'text',
          name: 'Button Label Text',
          section: 'default',
          type: 'text',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'variant',
          name: 'Color Variant',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['btn-primary', 'btn-secondary', 'btn-accent', 'btn-neutral', 'btn-info', 'btn-success', 'btn-warning', 'btn-error', 'btn-ghost', 'btn-link'],
          value: ['btn-primary', 'btn-secondary', 'btn-accent', 'btn-neutral', 'btn-info', 'btn-success', 'btn-warning', 'btn-error', 'btn-ghost', 'btn-link'].find(v => cls.includes(v)) || 'btn-primary',
          options: [
            { label: 'Primary', value: 'btn-primary' },
            { label: 'Secondary', value: 'btn-secondary' },
            { label: 'Accent', value: 'btn-accent' },
            { label: 'Neutral', value: 'btn-neutral' },
            { label: 'Info', value: 'btn-info' },
            { label: 'Success', value: 'btn-success' },
            { label: 'Warning', value: 'btn-warning' },
            { label: 'Error', value: 'btn-error' },
            { label: 'Ghost', value: 'btn-ghost' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          section: 'default',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['btn-xs', 'btn-sm', 'btn-md', 'btn-lg'],
          value: ['btn-xs', 'btn-sm', 'btn-md', 'btn-lg'].find(s => cls.includes(s)) || 'btn-md',
          options: [
            { label: 'XS', value: 'btn-xs' },
            { label: 'SM', value: 'btn-sm' },
            { label: 'MD', value: 'btn-md' },
            { label: 'LG', value: 'btn-lg' }
          ]
        },
        {
          key: 'style',
          name: 'Visual Modifier',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['btn-outline', 'btn-soft', 'btn-dash'],
          value: ['btn-outline', 'btn-soft', 'btn-dash'].find(s => cls.includes(s)) || 'none',
          options: [
            { label: 'Solid Standard', value: 'none' },
            { label: 'Outline Bordered', value: 'btn-outline' },
            { label: 'Soft Tone', value: 'btn-soft' },
            { label: 'Dashed Border', value: 'btn-dash' }
          ]
        },
        {
          key: 'shape',
          name: 'Shape & Width',
          section: 'default',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['btn-wide', 'btn-block', 'btn-circle', 'btn-square'],
          value: ['btn-wide', 'btn-block', 'btn-circle', 'btn-square'].find(s => cls.includes(s)) || 'none',
          options: [
            { label: 'Default', value: 'none' },
            { label: 'Wide', value: 'btn-wide' },
            { label: 'Block', value: 'btn-block' },
            { label: 'Circle', value: 'btn-circle' }
          ]
        }
      ];

      if (tag === 'a') {
        props.push({
          key: 'href',
          name: 'Link URL',
          section: 'default',
          type: 'text',
          htmlAttr: 'href',
          value: el.getAttribute('href') || '#'
        });
      }

      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 6. HEADING ARCHETYPE (components-html.js 1:1)
  // ==========================================
  Registry.register({
    id: 'heading',
    name: 'Heading',
    category: 'Typography & Structure',
    match: function(el) {
      const tag = getTag(el);
      return ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag);
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Heading Hierarchy' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      const props = [
        {
          key: 'text',
          name: 'Heading Text',
          section: 'default',
          type: 'textarea',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'level',
          name: 'Tag Level',
          section: 'default',
          type: 'buttons',
          value: tag.toUpperCase(),
          options: [
            { label: 'H1', value: 'H1' },
            { label: 'H2', value: 'H2' },
            { label: 'H3', value: 'H3' },
            { label: 'H4', value: 'H4' },
            { label: 'H5', value: 'H5' },
            { label: 'H6', value: 'H6' }
          ],
          onChange: function(node, val) {
            const newTag = val.toLowerCase();
            if (node.tagName.toLowerCase() === newTag) return;
            const newEl = document.createElement(newTag);
            Array.from(node.attributes).forEach(attr => newEl.setAttribute(attr.name, attr.value));
            newEl.innerHTML = node.innerHTML;
            node.parentNode.replaceChild(newEl, node);
          }
        },
        {
          key: 'align',
          name: 'Alignment',
          section: 'default',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['text-left', 'text-center', 'text-right'],
          value: ['text-left', 'text-center', 'text-right'].find(a => cls.includes(a)) || 'text-left',
          options: [
            { label: 'Left', value: 'text-left' },
            { label: 'Center', value: 'text-center' },
            { label: 'Right', value: 'text-right' }
          ]
        },
        {
          key: 'color',
          name: 'Color Accent',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['text-primary', 'text-secondary', 'text-accent', 'text-base-content', 'text-neutral'],
          value: ['text-primary', 'text-secondary', 'text-accent', 'text-neutral'].find(c => cls.includes(c)) || 'text-base-content',
          options: [
            { label: 'Default Content', value: 'text-base-content' },
            { label: 'Primary Accent', value: 'text-primary' },
            { label: 'Secondary Accent', value: 'text-secondary' },
            { label: 'Accent Tone', value: 'text-accent' }
          ]
        }
      ];

      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 7. CARD ARCHETYPE
  // ==========================================
  Registry.register({
    id: 'card',
    name: 'Card Container',
    category: 'Cards & Media',
    match: function(el) { return safeClasses(el).includes('card'); },
    getSections: function() {
      return [
        { id: 'default', header: 'Card Framing' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'shadow',
          name: 'Elevation Shadow',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['shadow-none', 'shadow-xs', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl'],
          value: ['shadow-none', 'shadow-xs', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl'].find(s => cls.includes(s)) || 'shadow',
          options: [
            { label: 'None', value: 'shadow-none' },
            { label: 'Subtle', value: 'shadow-sm' },
            { label: 'Standard', value: 'shadow' },
            { label: 'Elevated', value: 'shadow-md' },
            { label: 'Floating', value: 'shadow-xl' }
          ]
        },
        {
          key: 'bordered',
          name: 'Border Frame',
          section: 'default',
          type: 'toggle',
          value: cls.includes('card-border') || cls.includes('border'),
          onChange: function(node, val) {
            if (val) node.classList.add('border', 'border-base-content/10');
            else node.classList.remove('border', 'border-base-content/10');
          }
        },
        {
          key: 'side',
          name: 'Horizontal Layout (Side Image)',
          section: 'default',
          type: 'toggle',
          value: cls.includes('card-side'),
          onChange: function(node, val) {
            if (val) node.classList.add('card-side');
            else node.classList.remove('card-side');
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 8. BADGE ARCHETYPE
  // ==========================================
  Registry.register({
    id: 'badge',
    name: 'Badge',
    category: 'Typography & Structure',
    match: function(el) { return safeClasses(el).includes('badge'); },
    getSections: function() {
      return [
        { id: 'default', header: 'Badge Styling' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'text',
          name: 'Badge Text',
          section: 'default',
          type: 'text',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'variant',
          name: 'Color Variant',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['badge-primary', 'badge-secondary', 'badge-accent', 'badge-neutral', 'badge-info', 'badge-success', 'badge-warning', 'badge-error', 'badge-ghost'],
          value: ['badge-primary', 'badge-secondary', 'badge-accent', 'badge-neutral', 'badge-info', 'badge-success', 'badge-warning', 'badge-error', 'badge-ghost'].find(v => cls.includes(v)) || 'badge-primary',
          options: [
            { label: 'Primary', value: 'badge-primary' },
            { label: 'Secondary', value: 'badge-secondary' },
            { label: 'Accent', value: 'badge-accent' },
            { label: 'Neutral', value: 'badge-neutral' },
            { label: 'Info', value: 'badge-info' },
            { label: 'Success', value: 'badge-success' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          section: 'default',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['badge-xs', 'badge-sm', 'badge-md', 'badge-lg'],
          value: ['badge-xs', 'badge-sm', 'badge-md', 'badge-lg'].find(s => cls.includes(s)) || 'badge-md',
          options: [
            { label: 'XS', value: 'badge-xs' },
            { label: 'SM', value: 'badge-sm' },
            { label: 'MD', value: 'badge-md' },
            { label: 'LG', value: 'badge-lg' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 9. STATS GRID ARCHETYPE
  // ==========================================
  Registry.register({
    id: 'stats',
    name: 'Stats Grid',
    category: 'Feedback & Overlays',
    match: function(el) { return safeClasses(el).includes('stats'); },
    getSections: function() {
      return [
        { id: 'default', header: 'Stats Alignment' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'orientation',
          name: 'Layout Orientation',
          section: 'default',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['stats-horizontal', 'stats-vertical'],
          value: cls.includes('stats-vertical') ? 'stats-vertical' : 'stats-horizontal',
          options: [
            { label: 'Horizontal', value: 'stats-horizontal' },
            { label: 'Vertical', value: 'stats-vertical' }
          ]
        },
        {
          key: 'shadow',
          name: 'Elevation Shadow',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg'],
          value: ['shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg'].find(s => cls.includes(s)) || 'shadow',
          options: [
            { label: 'None', value: 'shadow-none' },
            { label: 'Subtle', value: 'shadow-sm' },
            { label: 'Standard', value: 'shadow' },
            { label: 'Elevated', value: 'shadow-md' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 10. NAVBAR ARCHETYPE
  // ==========================================
  Registry.register({
    id: 'navbar',
    name: 'Navbar',
    category: 'Navigation & Menus',
    match: function(el) { return safeClasses(el).includes('navbar'); },
    getSections: function() {
      return [
        { id: 'default', header: 'Navbar Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'bg',
          name: 'Background Tone',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'bg-neutral text-neutral-content', 'bg-transparent'],
          value: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'bg-neutral text-neutral-content', 'bg-transparent'].find(b => cls.includes(b)) || 'bg-base-100',
          options: [
            { label: 'Base 100', value: 'bg-base-100' },
            { label: 'Base 200', value: 'bg-base-200' },
            { label: 'Dark Neutral', value: 'bg-neutral text-neutral-content' },
            { label: 'Transparent', value: 'bg-transparent' }
          ]
        },
        {
          key: 'sticky',
          name: 'Sticky Header',
          section: 'default',
          type: 'toggle',
          value: cls.includes('sticky'),
          onChange: function(node, val) {
            if (val) node.classList.add('sticky', 'top-0', 'z-40');
            else node.classList.remove('sticky', 'top-0', 'z-40');
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // Expose to window
  window.NexusBuilderComponents = Registry;

})();
