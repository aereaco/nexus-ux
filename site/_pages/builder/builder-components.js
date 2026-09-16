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
      } else if (prop.htmlAttr === 'value') {
        el.value = value;
        if (value === null || value === '' || value === false) {
          el.removeAttribute('value');
        } else {
          el.setAttribute('value', value);
        }
      } else if (prop.htmlAttr === 'checked') {
        el.checked = !!value;
        if (value) {
          el.setAttribute('checked', '');
        } else {
          el.removeAttribute('checked');
        }
      } else if (prop.htmlAttr === 'disabled') {
        el.disabled = !!value;
        if (value) el.setAttribute('disabled', ''); else el.removeAttribute('disabled');
      } else if (prop.htmlAttr === 'readonly') {
        el.readOnly = !!value;
        if (value) el.setAttribute('readonly', ''); else el.removeAttribute('readonly');
      } else if (prop.htmlAttr === 'required') {
        el.required = !!value;
        if (value) el.setAttribute('required', ''); else el.removeAttribute('required');
      } else if (prop.htmlAttr === 'multiple') {
        el.multiple = !!value;
        if (value) el.setAttribute('multiple', ''); else el.removeAttribute('multiple');
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

  // ==========================================
  // 11. CONTAINER ARCHETYPE (DaisyUI/Tailwind)
  // ==========================================
  Registry.register({
    id: 'container',
    name: 'Container',
    category: 'Layout & Containers',
    match: function(el) {
      const cls = safeClasses(el);
      const tag = getTag(el);
      return tag === 'div' && cls.some(c => c.startsWith('container') || c === 'w-full');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Container Settings' },
        { id: 'spacing', header: 'Spacing' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const maxWidthCls = cls.find(c => c.startsWith('container')) || '';
      const padXCls = cls.find(c => c.startsWith('px-')) || '';
      const padYCls = cls.find(c => c.startsWith('py-')) || '';

      const props = [
        {
          key: 'maxWidth',
          name: 'Max Width',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['container', 'container-sm', 'container-md', 'container-lg', 'container-xl', 'container-2xl', 'w-full'],
          value: maxWidthCls || 'container',
          options: [
            { label: 'Default (768px)', value: 'container' },
            { label: 'Small (640px)', value: 'container-sm' },
            { label: 'Medium (768px)', value: 'container-md' },
            { label: 'Large (1024px)', value: 'container-lg' },
            { label: 'XL (1280px)', value: 'container-xl' },
            { label: '2XL (1536px)', value: 'container-2xl' },
            { label: 'Full Width', value: 'w-full' }
          ],
          onChange: function(node, val) {
            const validCls = ['container', 'container-sm', 'container-md', 'container-lg', 'container-xl', 'container-2xl'];
            validCls.forEach(function(c) { node.classList.remove(c); });
            node.classList.remove('w-full');
            if (val && val !== 'none') node.classList.add(val);
          }
        },
        {
          key: 'paddingX',
          name: 'Horizontal Padding',
          section: 'spacing',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['px-0', 'px-1', 'px-2', 'px-3', 'px-4', 'px-6', 'px-8'],
          value: padXCls || 'px-4',
          options: [
            { label: 'None', value: 'px-0' },
            { label: '0.25rem', value: 'px-1' },
            { label: '0.5rem', value: 'px-2' },
            { label: '0.75rem', value: 'px-3' },
            { label: '1rem (default)', value: 'px-4' },
            { label: '1.5rem', value: 'px-6' },
            { label: '2rem', value: 'px-8' }
          ],
          onChange: function(node, val) {
            ['px-0', 'px-1', 'px-2', 'px-3', 'px-4', 'px-6', 'px-8'].forEach(function(c) { node.classList.remove(c); });
            if (val) node.classList.add(val);
          }
        },
        {
          key: 'paddingY',
          name: 'Vertical Padding',
          section: 'spacing',
          type: 'text',
          htmlAttr: 'class',
          value: padYCls || '',
          onChange: function(node, val) {
            const oldCls = cls.find(c => c.startsWith('py-')) || '';
            if (oldCls) node.classList.remove(oldCls);
            if (val && val.trim()) node.classList.add(val.trim());
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 12. HEADER ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'header',
    name: 'Header / Banner',
    category: 'Layout & Containers',
    match: function(el) {
      return getTag(el) === 'header' && el.closest('.drawer') === null;
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Header Settings' },
        { id: 'shadow', header: 'Shadow & Depth' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'sticky',
          name: 'Sticky Header',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          value: cls.includes('sticky'),
          onChange: function(node, val) {
            if (val) node.classList.add('sticky', 'top-0', 'z-40', 'bg-base-100', 'shadow');
            else node.classList.remove('sticky', 'top-0', 'z-40', 'shadow');
          }
        },
        {
          key: 'bg',
          name: 'Background',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'bg-neutral text-neutral-content', 'bg-transparent'],
          value: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'bg-neutral text-neutral-content', 'bg-transparent'].find(b => cls.includes(b)) || 'bg-base-100',
          options: [
            { label: 'Base 100', value: 'bg-base-100' },
            { label: 'Base 200', value: 'bg-base-200' },
            { label: 'Base 300', value: 'bg-base-300' },
            { label: 'Dark Neutral', value: 'bg-neutral text-neutral-content' },
            { label: 'Transparent', value: 'bg-transparent' }
          ]
        },
        {
          key: 'shadowDepth',
          name: 'Shadow Depth',
          section: 'shadow',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'],
          value: ['shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'].find(s => cls.includes(s)) || 'shadow',
          options: [
            { label: 'None', value: 'shadow-none' },
            { label: 'Subtle', value: 'shadow-sm' },
            { label: 'Standard', value: 'shadow' },
            { label: 'Medium', value: 'shadow-md' },
            { label: 'Large', value: 'shadow-lg' },
            { label: 'XL', value: 'shadow-xl' },
            { label: '2XL', value: 'shadow-2xl' }
          ],
          onChange: function(node, val) {
            ['shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'].forEach(function(c) { node.classList.remove(c); });
            if (val && val !== 'shadow-none') node.classList.add(val);
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 13. FOOTER ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'footer',
    name: 'Footer',
    category: 'Layout & Containers',
    match: function(el) {
      return getTag(el) === 'footer';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Footer Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'centered',
          name: 'Centered Layout',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          value: cls.includes('footer-center'),
          onChange: function(node, val) {
            if (val) node.classList.add('footer-center');
            else node.classList.remove('footer-center');
          }
        },
        {
          key: 'bg',
          name: 'Background Tone',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'bg-neutral text-neutral-content', 'bg-transparent'],
          value: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'bg-neutral text-neutral-content', 'bg-transparent'].find(b => cls.includes(b)) || 'bg-base-200',
          options: [
            { label: 'Base 100', value: 'bg-base-100' },
            { label: 'Base 200', value: 'bg-base-200' },
            { label: 'Base 300', value: 'bg-base-300' },
            { label: 'Dark Neutral', value: 'bg-neutral text-neutral-content' },
            { label: 'Transparent', value: 'bg-transparent' }
          ]
        },
        {
          key: 'divider',
          name: 'Top Divider',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          value: cls.includes('border-t'),
          onChange: function(node, val) {
            if (val) node.classList.add('border-t', 'border-base-content/10');
            else node.classList.remove('border-t', 'border-base-content/10');
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 14. HERO ARCHETYPE (DaisyUI hero)
  // ==========================================
  Registry.register({
    id: 'hero',
    name: 'Hero Section',
    category: 'Layout & Containers',
    match: function(el) {
      const cls = safeClasses(el);
      const tag = getTag(el);
      return (tag === 'section' || tag === 'div' || tag === 'main') && cls.includes('hero');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Hero Settings' },
        { id: 'background', header: 'Background Media' },
        { id: 'overlay', header: 'Color Overlay' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const bgCont = el.querySelector(':scope > .hero-bg');
      let currentBg = 'none';
      let bgImgSrc = '';
      let bgVidSrc = '';
      let hasOverlay = !!el.querySelector('.hero-overlay');

      if (bgCont) {
        const img = bgCont.querySelector('img');
        const vid = bgCont.querySelector('video');
        if (vid) { currentBg = 'video'; bgVidSrc = vid.getAttribute('src') || ''; }
        else if (img) { currentBg = 'image'; bgImgSrc = img.getAttribute('src') || ''; }
      }

      const props = [
        {
          key: 'minHeight',
          name: 'Minimum Height',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['min-h-[200px]', 'min-h-[400px]', 'min-h-[500px]', 'min-h-screen', 'min-h-0'],
          value: ['min-h-[200px]', 'min-h-[400px]', 'min-h-[500px]', 'min-h-screen', 'min-h-0'].find(h => cls.includes(h)) || 'min-h-[500px]',
          options: [
            { label: 'Small (200px)', value: 'min-h-[200px]' },
            { label: 'Medium (400px)', value: 'min-h-[400px]' },
            { label: 'Large (500px)', value: 'min-h-[500px]' },
            { label: 'Full Screen', value: 'min-h-screen' },
            { label: 'Auto', value: 'min-h-0' }
          ]
        },
        {
          key: 'contentAlign',
          name: 'Content Alignment',
          section: 'default',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['hero-start', 'hero-center', 'hero-end'],
          value: ['hero-start', 'hero-center', 'hero-end'].find(a => cls.includes(a)) || 'hero-center',
          options: [
            { label: 'Left', value: 'hero-start' },
            { label: 'Center', value: 'hero-center' },
            { label: 'Right', value: 'hero-end' }
          ]
        },
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
            { label: 'Video', value: 'bg-video' }
          ],
          onChange: function(node, val) {
            let bgContainer = node.querySelector('.hero-bg');
            if (!bgContainer) {
              bgContainer = document.createElement('div');
              bgContainer.className = 'hero-bg absolute inset-0 -z-10';
              node.style.position = 'relative';
              node.insertBefore(bgContainer, node.firstChild);
            }
            bgContainer.innerHTML = '';
            if (val === 'bg-image') {
              const img = document.createElement('img');
              img.className = 'w-full h-full object-cover';
              img.src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&q=80';
              bgContainer.appendChild(img);
            } else if (val === 'bg-video') {
              const vid = document.createElement('video');
              vid.className = 'w-full h-full object-cover';
              vid.autoplay = true; vid.loop = true; vid.muted = true; vid.playsInline = true;
              vid.src = 'https://www.w3schools.com/html/mov_bbb.mp4';
              bgContainer.appendChild(vid);
            }
          }
        },
        {
          key: 'bg-image-src',
          name: 'Image Source URL',
          section: 'background',
          group: 'bg-image',
          type: 'image',
          value: bgImgSrc,
          onChange: function(node, val) {
            const img = node.querySelector('.hero-bg > img');
            if (img) img.src = val;
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
            const vid = node.querySelector('.hero-bg > video');
            if (vid) vid.src = val;
          }
        },
        {
          key: 'overlay',
          name: 'Enable Color Overlay',
          section: 'overlay',
          type: 'toggle',
          value: hasOverlay,
          refreshes: true,
          onChange: function(node, val) {
            let o = node.querySelector('.hero-overlay');
            if (val) {
              if (!o) {
                o = document.createElement('div');
                o.className = 'hero-overlay absolute inset-0 -z-5 bg-black/60';
                node.style.position = 'relative';
                node.insertBefore(o, node.firstChild);
              } else o.classList.remove('hidden');
            } else if (o) o.classList.add('hidden');
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 15. DRAWER ARCHETYPE (DaisyUI drawer)
  // ==========================================
  Registry.register({
    id: 'drawer',
    name: 'Drawer / Sidebar',
    category: 'Layout & Containers',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('drawer') || getTag(el) === 'div' && (el.closest('.drawer') !== null);
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Drawer Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'open',
          name: 'Drawer Open',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          value: cls.includes('drawer-open') || el.querySelector('.drawer-toggle:checked'),
          onChange: function(node, val) {
            if (val) node.classList.add('drawer-open');
            else node.classList.remove('drawer-open');
          }
        },
        {
          key: 'sidePosition',
          name: 'Sidebar Side',
          section: 'default',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['drawer-end', 'drawer-start'],
          value: cls.includes('drawer-end') ? 'drawer-end' : 'drawer-start',
          options: [
            { label: 'Left', value: 'drawer-start' },
            { label: 'Right', value: 'drawer-end' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 16. FLEX CONTAINER ARCHETYPE (DaisyUI/Tailwind)
  // ==========================================
  Registry.register({
    id: 'flex',
    name: 'Flex Container',
    category: 'Layout & Containers',
    match: function(el) {
      const cls = safeClasses(el);
      return getTag(el) === 'div' && cls.includes('flex') && !cls.includes('flex-') && !cls.includes('inline-flex');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Flex Direction' },
        { id: 'alignment', header: 'Alignment' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'direction',
          name: 'Flex Direction',
          section: 'default',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['flex-row', 'flex-row-reverse', 'flex-col', 'flex-col-reverse'],
          value: ['flex-row-reverse', 'flex-col', 'flex-col-reverse'].find(d => cls.includes(d)) || 'flex-row',
          options: [
            { label: 'Row →', value: 'flex-row' },
            { label: 'Row ←', value: 'flex-row-reverse' },
            { label: 'Col ↓', value: 'flex-col' },
            { label: 'Col ↑', value: 'flex-col-reverse' }
          ]
        },
        {
          key: 'wrap',
          name: 'Flex Wrap',
          section: 'default',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['flex-wrap', 'flex-nowrap', 'flex-wrap-reverse'],
          value: cls.includes('flex-wrap-reverse') ? 'flex-wrap-reverse' : (cls.includes('flex-wrap') ? 'flex-wrap' : (cls.includes('flex-nowrap') ? 'flex-nowrap' : 'flex-wrap')),
          options: [
            { label: 'Wrap', value: 'flex-wrap' },
            { label: 'No Wrap', value: 'flex-nowrap' },
            { label: 'Reverse', value: 'flex-wrap-reverse' }
          ]
        },
        {
          key: 'justifyContent',
          name: 'Justify Content',
          section: 'alignment',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around', 'justify-evenly', 'justify-items-start', 'justify-items-center', 'justify-items-end'],
          value: ['justify-center', 'justify-end', 'justify-between', 'justify-around', 'justify-evenly', 'justify-items-start', 'justify-items-center', 'justify-items-end'].find(j => cls.includes(j)) || 'justify-start',
          options: [
            { label: 'Start', value: 'justify-start' },
            { label: 'Center', value: 'justify-center' },
            { label: 'End', value: 'justify-end' },
            { label: 'Between', value: 'justify-between' },
            { label: 'Around', value: 'justify-around' }
          ]
        },
        {
          key: 'alignItems',
          name: 'Align Items',
          section: 'alignment',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['items-start', 'items-center', 'items-end', 'items-baseline', 'items-stretch'],
          value: ['items-center', 'items-end', 'items-baseline', 'items-stretch'].find(a => cls.includes(a)) || 'items-start',
          options: [
            { label: 'Start', value: 'items-start' },
            { label: 'Center', value: 'items-center' },
            { label: 'End', value: 'items-end' },
            { label: 'Stretch', value: 'items-stretch' }
          ]
        },
        {
          key: 'gap',
          name: 'Gap',
          section: 'alignment',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['gap-0', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-8'],
          value: ['gap-0', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-8'].find(g => cls.includes(g)) || 'gap-4',
          options: [
            { label: 'None', value: 'gap-0' },
            { label: '0.25rem', value: 'gap-1' },
            { label: '0.5rem', value: 'gap-2' },
            { label: '0.75rem', value: 'gap-3' },
            { label: '1rem', value: 'gap-4' },
            { label: '1.5rem', value: 'gap-6' },
            { label: '2rem', value: 'gap-8' }
          ],
          onChange: function(node, val) {
            ['gap-0', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-8'].forEach(function(c) { node.classList.remove(c); });
            if (val) node.classList.add(val);
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 17. MOCKUP WINDOW ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'mockup-window',
    name: 'Mockup Window',
    category: 'Layout & Containers',
    match: function(el) {
      return safeClasses(el).includes('mockup-window');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Mockup Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'bg',
          name: 'Background',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'bg-neutral'],
          value: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'bg-neutral'].find(b => cls.includes(b)) || 'bg-base-100',
          options: [
            { label: 'Base 100', value: 'bg-base-100' },
            { label: 'Base 200', value: 'bg-base-200' },
            { label: 'Base 300', value: 'bg-base-300' },
            { label: 'Neutral', value: 'bg-neutral' }
          ]
        },
        {
          key: 'border',
          name: 'Show Border',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          value: cls.includes('border'),
          onChange: function(node, val) {
            if (val) node.classList.add('border', 'border-base-content/10');
            else node.classList.remove('border', 'border-base-content/10');
          }
        },
        {
          key: 'titleBar',
          name: 'Show Title Bar',
          section: 'default',
          type: 'toggle',
          value: !!el.querySelector('.mockup-button'),
          onChange: function(node, val) {
            let btn = node.querySelector('.mockup-button');
            if (val && !btn) {
              btn = document.createElement('div');
              btn.className = 'mockup-button';
              node.insertBefore(btn, node.firstChild);
            } else if (!val && btn) {
              btn.remove();
            }
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 18. MOCKUP BROWSER ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'mockup-browser',
    name: 'Mockup Browser',
    category: 'Layout & Containers',
    match: function(el) {
      return safeClasses(el).includes('mockup-browser');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Browser Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const urlBar = el.querySelector('.mockup-browser-url');
      const props = [
        {
          key: 'url',
          name: 'URL Bar Text',
          section: 'default',
          type: 'text',
          value: urlBar ? (urlBar.textContent || '') : 'www.example.com',
          onChange: function(node, val) {
            let urlEl = node.querySelector('.mockup-browser-url');
            if (!urlEl) {
              urlEl = document.createElement('div');
              urlEl.className = 'mockup-browser-url';
              node.insertBefore(urlEl, node.firstChild);
            }
            urlEl.textContent = val;
          }
        },
        {
          key: 'bg',
          name: 'Background',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'bg-neutral'],
          value: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'bg-neutral'].find(b => cls.includes(b)) || 'bg-base-100',
          options: [
            { label: 'Base 100', value: 'bg-base-100' },
            { label: 'Base 200', value: 'bg-base-200' },
            { label: 'Base 300', value: 'bg-base-300' },
            { label: 'Neutral', value: 'bg-neutral' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 19. MOCKUP PHONE ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'mockup-phone',
    name: 'Mockup Phone',
    category: 'Layout & Containers',
    match: function(el) {
      return safeClasses(el).includes('mockup-phone');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Phone Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'orientation',
          name: 'Orientation',
          section: 'default',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['mockup-phone', 'mockup-phone-horizontal'],
          value: cls.includes('mockup-phone-horizontal') ? 'mockup-phone-horizontal' : 'mockup-phone',
          options: [
            { label: 'Portrait', value: 'mockup-phone' },
            { label: 'Landscape', value: 'mockup-phone-horizontal' }
          ]
        },
        {
          key: 'bg',
          name: 'Background',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['bg-base-100', 'bg-base-200', 'bg-neutral'],
          value: ['bg-base-100', 'bg-base-200', 'bg-neutral'].find(b => cls.includes(b)) || 'bg-base-100',
          options: [
            { label: 'Base 100', value: 'bg-base-100' },
            { label: 'Base 200', value: 'bg-base-200' },
            { label: 'Neutral', value: 'bg-neutral' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 20. CHECKBOX ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'checkbox',
    name: 'Checkbox',
    category: 'Data Inputs',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'input' && el.type === 'checkbox' && (cls.includes('checkbox') || (!cls.includes('toggle') && !cls.includes('drawer-toggle')));
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Checkbox Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'checked',
          name: 'Checked',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'checked',
          value: el.checked || el.hasAttribute('checked')
        },
        {
          key: 'variant',
          name: 'Color Variant',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['checkbox-primary', 'checkbox-secondary', 'checkbox-accent', 'checkbox-success', 'checkbox-warning', 'checkbox-info', 'checkbox-error'],
          value: ['checkbox-primary', 'checkbox-secondary', 'checkbox-accent', 'checkbox-success', 'checkbox-warning', 'checkbox-info', 'checkbox-error'].find(v => cls.includes(v)) || 'checkbox-primary',
          options: [
            { label: 'Primary', value: 'checkbox-primary' },
            { label: 'Secondary', value: 'checkbox-secondary' },
            { label: 'Accent', value: 'checkbox-accent' },
            { label: 'Success', value: 'checkbox-success' },
            { label: 'Warning', value: 'checkbox-warning' },
            { label: 'Info', value: 'checkbox-info' },
            { label: 'Error', value: 'checkbox-error' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['checkbox-xs', 'checkbox-sm', 'checkbox-md', 'checkbox-lg', 'checkbox-xl'],
          value: ['checkbox-xs', 'checkbox-sm', 'checkbox-md', 'checkbox-lg', 'checkbox-xl'].find(s => cls.includes(s)) || 'checkbox-md',
          options: [
            { label: 'Tiny (XS)', value: 'checkbox-xs' },
            { label: 'Small (SM)', value: 'checkbox-sm' },
            { label: 'Medium (MD)', value: 'checkbox-md' },
            { label: 'Large (LG)', value: 'checkbox-lg' },
            { label: 'Extra Large (XL)', value: 'checkbox-xl' }
          ]
        },
        {
          key: 'disabled',
          name: 'Disabled',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'disabled',
          value: el.disabled || el.hasAttribute('disabled')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 21. TOGGLE ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'toggle',
    name: 'Toggle Switch',
    category: 'Data Inputs',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'input' && el.type === 'checkbox' && cls.includes('toggle');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Toggle Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'checked',
          name: 'Active / Checked',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'checked',
          value: el.checked || el.hasAttribute('checked')
        },
        {
          key: 'variant',
          name: 'Color Variant',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['toggle-primary', 'toggle-secondary', 'toggle-accent', 'toggle-success', 'toggle-warning', 'toggle-info', 'toggle-error'],
          value: ['toggle-primary', 'toggle-secondary', 'toggle-accent', 'toggle-success', 'toggle-warning', 'toggle-info', 'toggle-error'].find(v => cls.includes(v)) || 'toggle-primary',
          options: [
            { label: 'Primary', value: 'toggle-primary' },
            { label: 'Secondary', value: 'toggle-secondary' },
            { label: 'Accent', value: 'toggle-accent' },
            { label: 'Success', value: 'toggle-success' },
            { label: 'Warning', value: 'toggle-warning' },
            { label: 'Info', value: 'toggle-info' },
            { label: 'Error', value: 'toggle-error' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['toggle-xs', 'toggle-sm', 'toggle-md', 'toggle-lg', 'toggle-xl'],
          value: ['toggle-xs', 'toggle-sm', 'toggle-md', 'toggle-lg', 'toggle-xl'].find(s => cls.includes(s)) || 'toggle-md',
          options: [
            { label: 'Tiny (XS)', value: 'toggle-xs' },
            { label: 'Small (SM)', value: 'toggle-sm' },
            { label: 'Medium (MD)', value: 'toggle-md' },
            { label: 'Large (LG)', value: 'toggle-lg' },
            { label: 'Extra Large (XL)', value: 'toggle-xl' }
          ]
        },
        {
          key: 'disabled',
          name: 'Disabled',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'disabled',
          value: el.disabled || el.hasAttribute('disabled')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 22. RADIO ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'radio',
    name: 'Radio Button',
    category: 'Data Inputs',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'input' && el.type === 'radio' && !cls.includes('mask');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Radio Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'name',
          name: 'Group Name',
          section: 'default',
          type: 'text',
          htmlAttr: 'name',
          value: el.getAttribute('name') || ''
        },
        {
          key: 'value',
          name: 'Radio Value',
          section: 'default',
          type: 'text',
          htmlAttr: 'value',
          value: el.getAttribute('value') || ''
        },
        {
          key: 'checked',
          name: 'Selected / Checked',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'checked',
          value: el.checked || el.hasAttribute('checked')
        },
        {
          key: 'variant',
          name: 'Color Variant',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['radio-primary', 'radio-secondary', 'radio-accent', 'radio-success', 'radio-warning', 'radio-info', 'radio-error'],
          value: ['radio-primary', 'radio-secondary', 'radio-accent', 'radio-success', 'radio-warning', 'radio-info', 'radio-error'].find(v => cls.includes(v)) || 'radio-primary',
          options: [
            { label: 'Primary', value: 'radio-primary' },
            { label: 'Secondary', value: 'radio-secondary' },
            { label: 'Accent', value: 'radio-accent' },
            { label: 'Success', value: 'radio-success' },
            { label: 'Warning', value: 'radio-warning' },
            { label: 'Info', value: 'radio-info' },
            { label: 'Error', value: 'radio-error' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['radio-xs', 'radio-sm', 'radio-md', 'radio-lg', 'radio-xl'],
          value: ['radio-xs', 'radio-sm', 'radio-md', 'radio-lg', 'radio-xl'].find(s => cls.includes(s)) || 'radio-md',
          options: [
            { label: 'Tiny (XS)', value: 'radio-xs' },
            { label: 'Small (SM)', value: 'radio-sm' },
            { label: 'Medium (MD)', value: 'radio-md' },
            { label: 'Large (LG)', value: 'radio-lg' },
            { label: 'Extra Large (XL)', value: 'radio-xl' }
          ]
        },
        {
          key: 'disabled',
          name: 'Disabled',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'disabled',
          value: el.disabled || el.hasAttribute('disabled')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 23. RANGE ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'range',
    name: 'Range Slider',
    category: 'Data Inputs',
    match: function(el) {
      return getTag(el) === 'input' && el.type === 'range';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Range Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'value',
          name: 'Current Value',
          section: 'default',
          type: 'number',
          htmlAttr: 'value',
          value: el.value || el.getAttribute('value') || 50
        },
        {
          key: 'min',
          name: 'Minimum',
          section: 'default',
          type: 'number',
          htmlAttr: 'min',
          value: el.getAttribute('min') || 0
        },
        {
          key: 'max',
          name: 'Maximum',
          section: 'default',
          type: 'number',
          htmlAttr: 'max',
          value: el.getAttribute('max') || 100
        },
        {
          key: 'step',
          name: 'Step Interval',
          section: 'default',
          type: 'number',
          htmlAttr: 'step',
          value: el.getAttribute('step') || 1
        },
        {
          key: 'variant',
          name: 'Color Variant',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['range-primary', 'range-secondary', 'range-accent', 'range-success', 'range-warning', 'range-info', 'range-error'],
          value: ['range-primary', 'range-secondary', 'range-accent', 'range-success', 'range-warning', 'range-info', 'range-error'].find(v => cls.includes(v)) || 'range-primary',
          options: [
            { label: 'Primary', value: 'range-primary' },
            { label: 'Secondary', value: 'range-secondary' },
            { label: 'Accent', value: 'range-accent' },
            { label: 'Success', value: 'range-success' },
            { label: 'Warning', value: 'range-warning' },
            { label: 'Info', value: 'range-info' },
            { label: 'Error', value: 'range-error' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['range-xs', 'range-sm', 'range-md', 'range-lg', 'range-xl'],
          value: ['range-xs', 'range-sm', 'range-md', 'range-lg', 'range-xl'].find(s => cls.includes(s)) || 'range-md',
          options: [
            { label: 'Tiny (XS)', value: 'range-xs' },
            { label: 'Small (SM)', value: 'range-sm' },
            { label: 'Medium (MD)', value: 'range-md' },
            { label: 'Large (LG)', value: 'range-lg' },
            { label: 'Extra Large (XL)', value: 'range-xl' }
          ]
        },
        {
          key: 'disabled',
          name: 'Disabled',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'disabled',
          value: el.disabled || el.hasAttribute('disabled')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 24. FILE INPUT ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'file-input',
    name: 'File Input',
    category: 'Data Inputs',
    match: function(el) {
      return getTag(el) === 'input' && el.type === 'file';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'File Input Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'accept',
          name: 'Accepted Types (accept)',
          section: 'default',
          type: 'text',
          htmlAttr: 'accept',
          value: el.getAttribute('accept') || ''
        },
        {
          key: 'multiple',
          name: 'Allow Multiple Files',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'multiple',
          value: el.hasAttribute('multiple')
        },
        {
          key: 'bordered',
          name: 'Bordered Style',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['file-input-bordered'],
          value: cls.includes('file-input-bordered') ? 'file-input-bordered' : ''
        },
        {
          key: 'ghost',
          name: 'Ghost Style',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['file-input-ghost'],
          value: cls.includes('file-input-ghost') ? 'file-input-ghost' : ''
        },
        {
          key: 'variant',
          name: 'Color Variant',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['file-input-primary', 'file-input-secondary', 'file-input-accent', 'file-input-info', 'file-input-success', 'file-input-warning', 'file-input-error'],
          value: ['file-input-primary', 'file-input-secondary', 'file-input-accent', 'file-input-info', 'file-input-success', 'file-input-warning', 'file-input-error'].find(v => cls.includes(v)) || '',
          options: [
            { label: 'Default', value: '' },
            { label: 'Primary', value: 'file-input-primary' },
            { label: 'Secondary', value: 'file-input-secondary' },
            { label: 'Accent', value: 'file-input-accent' },
            { label: 'Info', value: 'file-input-info' },
            { label: 'Success', value: 'file-input-success' },
            { label: 'Warning', value: 'file-input-warning' },
            { label: 'Error', value: 'file-input-error' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['file-input-xs', 'file-input-sm', 'file-input-md', 'file-input-lg', 'file-input-xl'],
          value: ['file-input-xs', 'file-input-sm', 'file-input-md', 'file-input-lg', 'file-input-xl'].find(s => cls.includes(s)) || 'file-input-md',
          options: [
            { label: 'Tiny (XS)', value: 'file-input-xs' },
            { label: 'Small (SM)', value: 'file-input-sm' },
            { label: 'Medium (MD)', value: 'file-input-md' },
            { label: 'Large (LG)', value: 'file-input-lg' },
            { label: 'Extra Large (XL)', value: 'file-input-xl' }
          ]
        },
        {
          key: 'disabled',
          name: 'Disabled',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'disabled',
          value: el.disabled || el.hasAttribute('disabled')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 25. TEXT INPUT ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'input',
    name: 'Text Input',
    category: 'Data Inputs',
    match: function(el) {
      return getTag(el) === 'input' && !['checkbox', 'radio', 'range', 'file', 'button', 'submit', 'reset'].includes(el.type);
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Input Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'type',
          name: 'Input Type',
          section: 'default',
          type: 'select',
          htmlAttr: 'type',
          value: el.type || 'text',
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Email', value: 'email' },
            { label: 'Password', value: 'password' },
            { label: 'Number', value: 'number' },
            { label: 'Telephone', value: 'tel' },
            { label: 'URL', value: 'url' },
            { label: 'Search', value: 'search' },
            { label: 'Date', value: 'date' },
            { label: 'Time', value: 'time' }
          ]
        },
        {
          key: 'placeholder',
          name: 'Placeholder',
          section: 'default',
          type: 'text',
          htmlAttr: 'placeholder',
          value: el.getAttribute('placeholder') || ''
        },
        {
          key: 'value',
          name: 'Input Value',
          section: 'default',
          type: 'text',
          htmlAttr: 'value',
          value: el.value || el.getAttribute('value') || ''
        },
        {
          key: 'bordered',
          name: 'Bordered Style',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['input-bordered'],
          value: cls.includes('input-bordered') ? 'input-bordered' : ''
        },
        {
          key: 'ghost',
          name: 'Ghost Style',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['input-ghost'],
          value: cls.includes('input-ghost') ? 'input-ghost' : ''
        },
        {
          key: 'variant',
          name: 'Color Variant',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['input-primary', 'input-secondary', 'input-accent', 'input-info', 'input-success', 'input-warning', 'input-error'],
          value: ['input-primary', 'input-secondary', 'input-accent', 'input-info', 'input-success', 'input-warning', 'input-error'].find(v => cls.includes(v)) || '',
          options: [
            { label: 'Default', value: '' },
            { label: 'Primary', value: 'input-primary' },
            { label: 'Secondary', value: 'input-secondary' },
            { label: 'Accent', value: 'input-accent' },
            { label: 'Info', value: 'input-info' },
            { label: 'Success', value: 'input-success' },
            { label: 'Warning', value: 'input-warning' },
            { label: 'Error', value: 'input-error' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['input-xs', 'input-sm', 'input-md', 'input-lg', 'input-xl'],
          value: ['input-xs', 'input-sm', 'input-md', 'input-lg', 'input-xl'].find(s => cls.includes(s)) || 'input-md',
          options: [
            { label: 'Tiny (XS)', value: 'input-xs' },
            { label: 'Small (SM)', value: 'input-sm' },
            { label: 'Medium (MD)', value: 'input-md' },
            { label: 'Large (LG)', value: 'input-lg' },
            { label: 'Extra Large (XL)', value: 'input-xl' }
          ]
        },
        {
          key: 'disabled',
          name: 'Disabled',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'disabled',
          value: el.disabled || el.hasAttribute('disabled')
        },
        {
          key: 'readonly',
          name: 'Read-only',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'readonly',
          value: el.readOnly || el.hasAttribute('readonly')
        },
        {
          key: 'required',
          name: 'Required',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'required',
          value: el.required || el.hasAttribute('required')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 26. TEXTAREA ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'textarea',
    name: 'Textarea',
    category: 'Data Inputs',
    match: function(el) {
      return getTag(el) === 'textarea';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Textarea Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'placeholder',
          name: 'Placeholder',
          section: 'default',
          type: 'text',
          htmlAttr: 'placeholder',
          value: el.getAttribute('placeholder') || ''
        },
        {
          key: 'rows',
          name: 'Visible Rows',
          section: 'default',
          type: 'number',
          htmlAttr: 'rows',
          value: el.getAttribute('rows') || 3
        },
        {
          key: 'value',
          name: 'Content Value',
          section: 'default',
          type: 'textarea',
          value: el.value || el.textContent || '',
          onChange: function(node, val) {
            node.value = val;
            node.textContent = val;
          }
        },
        {
          key: 'bordered',
          name: 'Bordered Style',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['textarea-bordered'],
          value: cls.includes('textarea-bordered') ? 'textarea-bordered' : ''
        },
        {
          key: 'ghost',
          name: 'Ghost Style',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['textarea-ghost'],
          value: cls.includes('textarea-ghost') ? 'textarea-ghost' : ''
        },
        {
          key: 'variant',
          name: 'Color Variant',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['textarea-primary', 'textarea-secondary', 'textarea-accent', 'textarea-info', 'textarea-success', 'textarea-warning', 'textarea-error'],
          value: ['textarea-primary', 'textarea-secondary', 'textarea-accent', 'textarea-info', 'textarea-success', 'textarea-warning', 'textarea-error'].find(v => cls.includes(v)) || '',
          options: [
            { label: 'Default', value: '' },
            { label: 'Primary', value: 'textarea-primary' },
            { label: 'Secondary', value: 'textarea-secondary' },
            { label: 'Accent', value: 'textarea-accent' },
            { label: 'Info', value: 'textarea-info' },
            { label: 'Success', value: 'textarea-success' },
            { label: 'Warning', value: 'textarea-warning' },
            { label: 'Error', value: 'textarea-error' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['textarea-xs', 'textarea-sm', 'textarea-md', 'textarea-lg', 'textarea-xl'],
          value: ['textarea-xs', 'textarea-sm', 'textarea-md', 'textarea-lg', 'textarea-xl'].find(s => cls.includes(s)) || 'textarea-md',
          options: [
            { label: 'Tiny (XS)', value: 'textarea-xs' },
            { label: 'Small (SM)', value: 'textarea-sm' },
            { label: 'Medium (MD)', value: 'textarea-md' },
            { label: 'Large (LG)', value: 'textarea-lg' },
            { label: 'Extra Large (XL)', value: 'textarea-xl' }
          ]
        },
        {
          key: 'disabled',
          name: 'Disabled',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'disabled',
          value: el.disabled || el.hasAttribute('disabled')
        },
        {
          key: 'readonly',
          name: 'Read-only',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'readonly',
          value: el.readOnly || el.hasAttribute('readonly')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 27. SELECT ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'select',
    name: 'Select Dropdown',
    category: 'Data Inputs',
    match: function(el) {
      return getTag(el) === 'select';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Select Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'bordered',
          name: 'Bordered Style',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['select-bordered'],
          value: cls.includes('select-bordered') ? 'select-bordered' : ''
        },
        {
          key: 'ghost',
          name: 'Ghost Style',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['select-ghost'],
          value: cls.includes('select-ghost') ? 'select-ghost' : ''
        },
        {
          key: 'variant',
          name: 'Color Variant',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['select-primary', 'select-secondary', 'select-accent', 'select-info', 'select-success', 'select-warning', 'select-error'],
          value: ['select-primary', 'select-secondary', 'select-accent', 'select-info', 'select-success', 'select-warning', 'select-error'].find(v => cls.includes(v)) || '',
          options: [
            { label: 'Default', value: '' },
            { label: 'Primary', value: 'select-primary' },
            { label: 'Secondary', value: 'select-secondary' },
            { label: 'Accent', value: 'select-accent' },
            { label: 'Info', value: 'select-info' },
            { label: 'Success', value: 'select-success' },
            { label: 'Warning', value: 'select-warning' },
            { label: 'Error', value: 'select-error' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['select-xs', 'select-sm', 'select-md', 'select-lg', 'select-xl'],
          value: ['select-xs', 'select-sm', 'select-md', 'select-lg', 'select-xl'].find(s => cls.includes(s)) || 'select-md',
          options: [
            { label: 'Tiny (XS)', value: 'select-xs' },
            { label: 'Small (SM)', value: 'select-sm' },
            { label: 'Medium (MD)', value: 'select-md' },
            { label: 'Large (LG)', value: 'select-lg' },
            { label: 'Extra Large (XL)', value: 'select-xl' }
          ]
        },
        {
          key: 'multiple',
          name: 'Multiple Selection',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'multiple',
          value: el.hasAttribute('multiple')
        },
        {
          key: 'disabled',
          name: 'Disabled',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'disabled',
          value: el.disabled || el.hasAttribute('disabled')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 28. RATING ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'rating',
    name: 'Rating Stars',
    category: 'Data Inputs',
    match: function(el) {
      return safeClasses(el).includes('rating');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Rating Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const firstMask = el.querySelector('.mask');
      const currentShape = firstMask && firstMask.className.includes('mask-heart') ? 'mask-heart' : 'mask-star-2';
      const props = [
        {
          key: 'shape',
          name: 'Rating Shape',
          section: 'default',
          type: 'select',
          value: currentShape,
          options: [
            { label: 'Star', value: 'mask-star-2' },
            { label: 'Heart', value: 'mask-heart' }
          ],
          onChange: function(node, val) {
            node.querySelectorAll('input.mask').forEach(function(inp) {
              inp.classList.remove('mask-star-2', 'mask-heart');
              inp.classList.add(val);
            });
          }
        },
        {
          key: 'size',
          name: 'Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['rating-xs', 'rating-sm', 'rating-md', 'rating-lg', 'rating-xl'],
          value: ['rating-xs', 'rating-sm', 'rating-md', 'rating-lg', 'rating-xl'].find(s => cls.includes(s)) || 'rating-sm',
          options: [
            { label: 'Tiny (XS)', value: 'rating-xs' },
            { label: 'Small (SM)', value: 'rating-sm' },
            { label: 'Medium (MD)', value: 'rating-md' },
            { label: 'Large (LG)', value: 'rating-lg' },
            { label: 'Extra Large (XL)', value: 'rating-xl' }
          ]
        },
        {
          key: 'half',
          name: 'Half Star Support',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['rating-half'],
          value: cls.includes('rating-half') ? 'rating-half' : ''
        },
        {
          key: 'starCount',
          name: 'Stars Count (1-10)',
          section: 'default',
          type: 'number',
          value: el.querySelectorAll('input[type="radio"]').length || 5,
          onChange: function(node, val) {
            const count = Math.max(1, Math.min(10, parseInt(val, 10) || 5));
            const currentInputs = Array.from(node.querySelectorAll('input[type="radio"]'));
            const radioName = (currentInputs[0] && currentInputs[0].name) || 'rating-' + Math.floor(Math.random()*1000);
            const maskClass = (currentInputs[0] && currentInputs[0].className.includes('mask-heart')) ? 'mask-heart' : 'mask-star-2';
            node.innerHTML = '';
            for (let i = 1; i <= count; i++) {
              const inp = document.createElement('input');
              inp.type = 'radio';
              inp.name = radioName;
              inp.className = `mask ${maskClass} bg-warning`;
              if (i === Math.ceil(count / 2)) inp.checked = true;
              node.appendChild(inp);
            }
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 29. INPUT GROUP ARCHETYPE (DaisyUI Join)
  // ==========================================
  Registry.register({
    id: 'input-group',
    name: 'Input Group (Join)',
    category: 'Data Inputs',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('join') && !!el.querySelector('input');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Input Group Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'direction',
          name: 'Layout Direction',
          section: 'default',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['join-horizontal', 'join-vertical'],
          value: cls.includes('join-vertical') ? 'join-vertical' : 'join-horizontal',
          options: [
            { label: 'Horizontal', value: 'join-horizontal' },
            { label: 'Vertical', value: 'join-vertical' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 30. BUTTON GROUP ARCHETYPE (DaisyUI Join)
  // ==========================================
  Registry.register({
    id: 'button-group',
    name: 'Button Group (Join)',
    category: 'Components',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('join') && !el.querySelector('input') && !!el.querySelector('.btn');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Button Group Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'direction',
          name: 'Layout Direction',
          section: 'default',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['join-horizontal', 'join-vertical'],
          value: cls.includes('join-vertical') ? 'join-vertical' : 'join-horizontal',
          options: [
            { label: 'Horizontal', value: 'join-horizontal' },
            { label: 'Vertical', value: 'join-vertical' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 31. BUTTON TOOLBAR ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'button-toolbar',
    name: 'Button Toolbar',
    category: 'Components',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('btn-toolbar') || (cls.includes('flex') && el.querySelectorAll('.join').length > 1);
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Toolbar Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'gap',
          name: 'Button Group Spacing',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-6'],
          value: ['gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-6'].find(g => cls.includes(g)) || 'gap-2',
          options: [
            { label: 'Tight (gap-1)', value: 'gap-1' },
            { label: 'Normal (gap-2)', value: 'gap-2' },
            { label: 'Medium (gap-3)', value: 'gap-3' },
            { label: 'Wide (gap-4)', value: 'gap-4' },
            { label: 'Large (gap-6)', value: 'gap-6' }
          ]
        },
        {
          key: 'justify',
          name: 'Alignment',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['justify-start', 'justify-center', 'justify-end', 'justify-between'],
          value: ['justify-start', 'justify-center', 'justify-end', 'justify-between'].find(j => cls.includes(j)) || 'justify-start',
          options: [
            { label: 'Start (Left)', value: 'justify-start' },
            { label: 'Center', value: 'justify-center' },
            { label: 'End (Right)', value: 'justify-end' },
            { label: 'Space Between', value: 'justify-between' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // 32. FORM ARCHETYPE (DaisyUI)
  // ==========================================
  Registry.register({
    id: 'form',
    name: 'Form Container',
    category: 'Data Inputs',
    match: function(el) {
      return getTag(el) === 'form';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Form Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const props = [
        {
          key: 'action',
          name: 'Action URL',
          section: 'default',
          type: 'text',
          htmlAttr: 'action',
          value: el.getAttribute('action') || ''
        },
        {
          key: 'method',
          name: 'HTTP Method',
          section: 'default',
          type: 'select',
          htmlAttr: 'method',
          value: (el.getAttribute('method') || 'GET').toUpperCase(),
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'dialog', value: 'dialog' }
          ]
        },
        {
          key: 'autocomplete',
          name: 'Autocomplete',
          section: 'default',
          type: 'select',
          htmlAttr: 'autocomplete',
          value: el.getAttribute('autocomplete') || 'on',
          options: [
            { label: 'On', value: 'on' },
            { label: 'Off', value: 'off' }
          ]
        },
        {
          key: 'novalidate',
          name: 'Disable HTML Validation (novalidate)',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'novalidate',
          value: el.hasAttribute('novalidate')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });


  // ==========================================
  // BATCH 3: TYPOGRAPHY & CONTENT (10 components)
  // ==========================================

  // 33. Label
  Registry.register({
    id: 'label',
    name: 'Form Label',
    category: 'Typography & Content',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'label' || cls.includes('label') || cls.includes('label-text');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Label Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const props = [
        {
          key: 'text',
          name: 'Label Text',
          section: 'default',
          type: 'text',
          value: el.innerText || '',
          onChange: function(node, val) { node.innerText = val; }
        },
        {
          key: 'for',
          name: 'For Element ID',
          section: 'default',
          type: 'text',
          htmlAttr: 'for',
          value: el.getAttribute('for') || ''
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 34. Paragraph / Lead
  Registry.register({
    id: 'paragraph',
    name: 'Paragraph',
    category: 'Typography & Content',
    match: function(el) {
      return getTag(el) === 'p';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Paragraph Settings' },
        { id: 'typography', header: 'Typography' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'text',
          name: 'Paragraph Content',
          section: 'default',
          type: 'textarea',
          value: el.innerText || '',
          onChange: function(node, val) { node.innerText = val; }
        },
        {
          key: 'lead',
          name: 'Lead Paragraph (Larger)',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['text-lg', 'text-xl', 'lead'],
          value: cls.includes('text-lg') || cls.includes('lead')
        },
        {
          key: 'align',
          name: 'Text Alignment',
          section: 'typography',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['text-left', 'text-center', 'text-right', 'text-justify'],
          value: ['text-left', 'text-center', 'text-right', 'text-justify'].find(function(c) { return cls.includes(c); }) || 'text-left',
          options: [
            { label: 'Left', value: 'text-left' },
            { label: 'Center', value: 'text-center' },
            { label: 'Right', value: 'text-right' },
            { label: 'Justify', value: 'text-justify' }
          ]
        },
        {
          key: 'size',
          name: 'Font Size',
          section: 'typography',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'],
          value: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'].find(function(c) { return cls.includes(c); }) || 'text-base',
          options: [
            { label: 'Extra Small (XS)', value: 'text-xs' },
            { label: 'Small (SM)', value: 'text-sm' },
            { label: 'Base', value: 'text-base' },
            { label: 'Large (LG)', value: 'text-lg' },
            { label: 'Extra Large (XL)', value: 'text-xl' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 35. Blockquote
  Registry.register({
    id: 'blockquote',
    name: 'Blockquote',
    category: 'Typography & Content',
    match: function(el) {
      return getTag(el) === 'blockquote';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Quote Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'quote',
          name: 'Quote Text',
          section: 'default',
          type: 'textarea',
          value: el.innerText || '',
          onChange: function(node, val) { node.innerText = val; }
        },
        {
          key: 'borderAccent',
          name: 'Border Accent',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['border-primary', 'border-secondary', 'border-accent', 'border-neutral', 'border-base-300'],
          value: ['border-primary', 'border-secondary', 'border-accent', 'border-neutral', 'border-base-300'].find(function(c) { return cls.includes(c); }) || 'border-primary',
          options: [
            { label: 'Primary', value: 'border-primary' },
            { label: 'Secondary', value: 'border-secondary' },
            { label: 'Accent', value: 'border-accent' },
            { label: 'Neutral', value: 'border-neutral' },
            { label: 'Muted', value: 'border-base-300' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 36. List
  Registry.register({
    id: 'list',
    name: 'List Container',
    category: 'Typography & Content',
    match: function(el) {
      const tag = getTag(el);
      return tag === 'ul' || tag === 'ol';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'List Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'listStyle',
          name: 'List Style',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['list-disc', 'list-decimal', 'list-none'],
          value: ['list-disc', 'list-decimal', 'list-none'].find(function(c) { return cls.includes(c); }) || 'list-disc',
          options: [
            { label: 'Bulleted (Disc)', value: 'list-disc' },
            { label: 'Numbered (Decimal)', value: 'list-decimal' },
            { label: 'None (Plain)', value: 'list-none' }
          ]
        },
        {
          key: 'spacing',
          name: 'Item Spacing',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['space-y-0', 'space-y-1', 'space-y-2', 'space-y-4'],
          value: ['space-y-0', 'space-y-1', 'space-y-2', 'space-y-4'].find(function(c) { return cls.includes(c); }) || 'space-y-1',
          options: [
            { label: 'Tight (0)', value: 'space-y-0' },
            { label: 'Normal (1)', value: 'space-y-1' },
            { label: 'Medium (2)', value: 'space-y-2' },
            { label: 'Relaxed (4)', value: 'space-y-4' }
          ]
        },
        {
          key: 'inside',
          name: 'Inside Indentation',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['list-inside'],
          value: cls.includes('list-inside')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 37. List Item
  Registry.register({
    id: 'list-item',
    name: 'List Item',
    category: 'Typography & Content',
    match: function(el) {
      return getTag(el) === 'li';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Item Content' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const props = [
        {
          key: 'text',
          name: 'Item Text',
          section: 'default',
          type: 'text',
          value: el.innerText || '',
          onChange: function(node, val) { node.innerText = val; }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 38. Pre / Mockup Code
  Registry.register({
    id: 'pre',
    name: 'Code Block',
    category: 'Typography & Content',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'pre' || cls.includes('mockup-code');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Code Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const codeChild = el.querySelector('code') || el;
      const props = [
        {
          key: 'code',
          name: 'Code Snippet',
          section: 'default',
          type: 'textarea',
          value: codeChild.textContent || '',
          onChange: function(node, val) {
            const c = node.querySelector('code') || node;
            c.textContent = val;
          }
        },
        {
          key: 'prefix',
          name: 'Line Prefix Prompt',
          section: 'default',
          type: 'text',
          htmlAttr: 'data-prefix',
          value: el.getAttribute('data-prefix') || '>'
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 39. Keyboard (Kbd)
  Registry.register({
    id: 'kbd',
    name: 'Keyboard Key (Kbd)',
    category: 'Typography & Content',
    match: function(el) {
      return getTag(el) === 'kbd' || safeClasses(el).includes('kbd');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Key Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'keyChar',
          name: 'Key Character',
          section: 'default',
          type: 'text',
          value: el.innerText || '',
          onChange: function(node, val) { node.innerText = val; }
        },
        {
          key: 'size',
          name: 'Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['kbd-xs', 'kbd-sm', 'kbd-md', 'kbd-lg'],
          value: ['kbd-xs', 'kbd-sm', 'kbd-md', 'kbd-lg'].find(function(c) { return cls.includes(c); }) || 'kbd-sm',
          options: [
            { label: 'Extra Small', value: 'kbd-xs' },
            { label: 'Small', value: 'kbd-sm' },
            { label: 'Medium', value: 'kbd-md' },
            { label: 'Large', value: 'kbd-lg' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 40. Divider / Hr
  Registry.register({
    id: 'hr',
    name: 'Divider',
    category: 'Typography & Content',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'hr' || cls.includes('divider');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Divider Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'label',
          name: 'Divider Text',
          section: 'default',
          type: 'text',
          value: el.innerText || '',
          onChange: function(node, val) { node.innerText = val; }
        },
        {
          key: 'orientation',
          name: 'Orientation',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['divider-horizontal', 'divider-vertical'],
          value: cls.includes('divider-horizontal') ? 'divider-horizontal' : 'divider-vertical',
          options: [
            { label: 'Vertical (Standard)', value: 'divider-vertical' },
            { label: 'Horizontal (In-row)', value: 'divider-horizontal' }
          ]
        },
        {
          key: 'variant',
          name: 'Color Tone',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['divider-neutral', 'divider-primary', 'divider-secondary', 'divider-accent', 'divider-info', 'divider-success', 'divider-warning', 'divider-error'],
          value: ['divider-neutral', 'divider-primary', 'divider-secondary', 'divider-accent', 'divider-info', 'divider-success', 'divider-warning', 'divider-error'].find(function(c) { return cls.includes(c); }) || 'none',
          options: [
            { label: 'Default', value: 'none' },
            { label: 'Neutral', value: 'divider-neutral' },
            { label: 'Primary', value: 'divider-primary' },
            { label: 'Secondary', value: 'divider-secondary' },
            { label: 'Accent', value: 'divider-accent' },
            { label: 'Info', value: 'divider-info' },
            { label: 'Success', value: 'divider-success' },
            { label: 'Warning', value: 'divider-warning' },
            { label: 'Error', value: 'divider-error' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 41. Alert Banner
  Registry.register({
    id: 'alert',
    name: 'Alert Banner',
    category: 'Typography & Content',
    match: function(el) {
      return safeClasses(el).includes('alert');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Alert Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'text',
          name: 'Message Content',
          section: 'default',
          type: 'text',
          value: el.innerText || '',
          onChange: function(node, val) { node.innerText = val; }
        },
        {
          key: 'variant',
          name: 'Alert Status Type',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['alert-info', 'alert-success', 'alert-warning', 'alert-error'],
          value: ['alert-info', 'alert-success', 'alert-warning', 'alert-error'].find(function(c) { return cls.includes(c); }) || 'alert-info',
          options: [
            { label: 'Info (Blue)', value: 'alert-info' },
            { label: 'Success (Green)', value: 'alert-success' },
            { label: 'Warning (Yellow)', value: 'alert-warning' },
            { label: 'Error (Red)', value: 'alert-error' }
          ]
        },
        {
          key: 'style',
          name: 'Alert Style',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['alert-soft', 'alert-outline', 'alert-dash'],
          value: ['alert-soft', 'alert-outline', 'alert-dash'].find(function(c) { return cls.includes(c); }) || 'none',
          options: [
            { label: 'Solid (Standard)', value: 'none' },
            { label: 'Soft Tint', value: 'alert-soft' },
            { label: 'Outline', value: 'alert-outline' },
            { label: 'Dashed Border', value: 'alert-dash' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 42. Badge Group
  Registry.register({
    id: 'badge-group',
    name: 'Badge Group',
    category: 'Typography & Content',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('badge-group') || (cls.includes('flex') && el.querySelector('.badge'));
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Group Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'gap',
          name: 'Spacing',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['gap-1', 'gap-2', 'gap-3', 'gap-4'],
          value: ['gap-1', 'gap-2', 'gap-3', 'gap-4'].find(function(c) { return cls.includes(c); }) || 'gap-1.5',
          options: [
            { label: 'Tight (1)', value: 'gap-1' },
            { label: 'Normal (2)', value: 'gap-2' },
            { label: 'Relaxed (3)', value: 'gap-3' },
            { label: 'Spacious (4)', value: 'gap-4' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // BATCH 4: NAVIGATION & MENUS (10 components)
  // ==========================================

  // 43. Link
  Registry.register({
    id: 'link',
    name: 'Hyperlink',
    category: 'Navigation',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'a' && !cls.includes('btn') && !cls.includes('tab');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Link Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'text',
          name: 'Link Text',
          section: 'default',
          type: 'text',
          value: el.innerText || '',
          onChange: function(node, val) { node.innerText = val; }
        },
        {
          key: 'href',
          name: 'URL Target (href)',
          section: 'default',
          type: 'text',
          htmlAttr: 'href',
          value: el.getAttribute('href') || '#'
        },
        {
          key: 'target',
          name: 'Open In',
          section: 'default',
          type: 'select',
          htmlAttr: 'target',
          value: el.getAttribute('target') || '_self',
          options: [
            { label: 'Same Window (_self)', value: '_self' },
            { label: 'New Tab (_blank)', value: '_blank' }
          ]
        },
        {
          key: 'variant',
          name: 'Color Variant',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['link-primary', 'link-secondary', 'link-accent', 'link-neutral', 'link-hover'],
          value: ['link-primary', 'link-secondary', 'link-accent', 'link-neutral', 'link-hover'].find(function(c) { return cls.includes(c); }) || 'link-primary',
          options: [
            { label: 'Primary', value: 'link-primary' },
            { label: 'Secondary', value: 'link-secondary' },
            { label: 'Accent', value: 'link-accent' },
            { label: 'Neutral', value: 'link-neutral' },
            { label: 'Hover Only', value: 'link-hover' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 44. Breadcrumbs
  Registry.register({
    id: 'breadcrumbs',
    name: 'Breadcrumbs Trail',
    category: 'Navigation',
    match: function(el) {
      return safeClasses(el).includes('breadcrumbs');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Breadcrumb Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'size',
          name: 'Text Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['text-xs', 'text-sm', 'text-base'],
          value: ['text-xs', 'text-sm', 'text-base'].find(function(c) { return cls.includes(c); }) || 'text-sm',
          options: [
            { label: 'Small (XS)', value: 'text-xs' },
            { label: 'Normal (SM)', value: 'text-sm' },
            { label: 'Medium (Base)', value: 'text-base' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 45. Breadcrumb Item
  Registry.register({
    id: 'breadcrumb-item',
    name: 'Breadcrumb Item',
    category: 'Navigation',
    match: function(el) {
      return getTag(el) === 'li' && el.parentElement && el.parentElement.closest('.breadcrumbs');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Item Content' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const link = el.querySelector('a') || el;
      const props = [
        {
          key: 'text',
          name: 'Label Text',
          section: 'default',
          type: 'text',
          value: link.innerText || '',
          onChange: function(node, val) {
            const a = node.querySelector('a') || node;
            a.innerText = val;
          }
        },
        {
          key: 'href',
          name: 'Link Target',
          section: 'default',
          type: 'text',
          value: link.getAttribute('href') || '#',
          onChange: function(node, val) {
            const a = node.querySelector('a') || node;
            a.setAttribute('href', val);
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 46. Dropdown
  Registry.register({
    id: 'dropdown',
    name: 'Dropdown',
    category: 'Navigation',
    match: function(el) {
      return safeClasses(el).includes('dropdown');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Dropdown Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'placement',
          name: 'Menu Placement',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['dropdown-bottom', 'dropdown-top', 'dropdown-left', 'dropdown-right', 'dropdown-end'],
          value: ['dropdown-bottom', 'dropdown-top', 'dropdown-left', 'dropdown-right', 'dropdown-end'].find(function(c) { return cls.includes(c); }) || 'dropdown-bottom',
          options: [
            { label: 'Bottom', value: 'dropdown-bottom' },
            { label: 'Top', value: 'dropdown-top' },
            { label: 'Left', value: 'dropdown-left' },
            { label: 'Right', value: 'dropdown-right' },
            { label: 'End (Right Aligned)', value: 'dropdown-end' }
          ]
        },
        {
          key: 'hover',
          name: 'Open on Hover',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['dropdown-hover'],
          value: cls.includes('dropdown-hover')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 47. Tabs Bar
  Registry.register({
    id: 'tabs',
    name: 'Tabs Bar',
    category: 'Navigation',
    match: function(el) {
      return safeClasses(el).includes('tabs');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Tabs Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'style',
          name: 'Tab Visual Style',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['tabs-bordered', 'tabs-lifted', 'tabs-box'],
          value: ['tabs-bordered', 'tabs-lifted', 'tabs-box'].find(function(c) { return cls.includes(c); }) || 'tabs-bordered',
          options: [
            { label: 'Bordered Underline', value: 'tabs-bordered' },
            { label: 'Lifted Tabs', value: 'tabs-lifted' },
            { label: 'Boxed Pills', value: 'tabs-box' }
          ]
        },
        {
          key: 'size',
          name: 'Tab Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['tabs-xs', 'tabs-sm', 'tabs-md', 'tabs-lg'],
          value: ['tabs-xs', 'tabs-sm', 'tabs-md', 'tabs-lg'].find(function(c) { return cls.includes(c); }) || 'tabs-md',
          options: [
            { label: 'Extra Small', value: 'tabs-xs' },
            { label: 'Small', value: 'tabs-sm' },
            { label: 'Medium', value: 'tabs-md' },
            { label: 'Large', value: 'tabs-lg' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 48. Tab Item
  Registry.register({
    id: 'tab-item',
    name: 'Tab Item',
    category: 'Navigation',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('tab') && !cls.includes('tabs');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Tab Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'label',
          name: 'Tab Label',
          section: 'default',
          type: 'text',
          value: el.innerText || '',
          onChange: function(node, val) { node.innerText = val; }
        },
        {
          key: 'active',
          name: 'Active Tab',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['tab-active'],
          value: cls.includes('tab-active')
        },
        {
          key: 'disabled',
          name: 'Disabled',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['tab-disabled'],
          value: cls.includes('tab-disabled')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 49. Collapse / Accordion Item
  Registry.register({
    id: 'collapse',
    name: 'Collapse Card',
    category: 'Navigation',
    match: function(el) {
      return safeClasses(el).includes('collapse');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Collapse Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const titleEl = el.querySelector('.collapse-title');
      const props = [
        {
          key: 'title',
          name: 'Collapse Title',
          section: 'default',
          type: 'text',
          value: titleEl ? titleEl.innerText : '',
          onChange: function(node, val) {
            const t = node.querySelector('.collapse-title');
            if (t) t.innerText = val;
          }
        },
        {
          key: 'iconStyle',
          name: 'Indicator Icon',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['collapse-arrow', 'collapse-plus'],
          value: ['collapse-arrow', 'collapse-plus'].find(function(c) { return cls.includes(c); }) || 'collapse-arrow',
          options: [
            { label: 'Arrow (Chevron)', value: 'collapse-arrow' },
            { label: 'Plus (+) / Minus (-)', value: 'collapse-plus' }
          ]
        },
        {
          key: 'open',
          name: 'Open by Default',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['collapse-open'],
          value: cls.includes('collapse-open')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 50. Pagination Container
  Registry.register({
    id: 'pagination',
    name: 'Pagination Bar',
    category: 'Navigation',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('join') && el.querySelector('.btn') && el.closest('nav');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Pagination Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const props = [
        {
          key: 'align',
          name: 'Alignment',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['justify-start', 'justify-center', 'justify-end'],
          value: 'justify-center',
          options: [
            { label: 'Left', value: 'justify-start' },
            { label: 'Center', value: 'justify-center' },
            { label: 'Right', value: 'justify-end' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 51. Steps Progress Bar
  Registry.register({
    id: 'steps',
    name: 'Steps Progress',
    category: 'Navigation',
    match: function(el) {
      return safeClasses(el).includes('steps');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Steps Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'orientation',
          name: 'Orientation',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['steps-horizontal', 'steps-vertical'],
          value: cls.includes('steps-vertical') ? 'steps-vertical' : 'steps-horizontal',
          options: [
            { label: 'Horizontal (Across)', value: 'steps-horizontal' },
            { label: 'Vertical (Stacked)', value: 'steps-vertical' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 52. Bottom Nav (Mobile)
  Registry.register({
    id: 'bottom-nav',
    name: 'Bottom Navigation Bar',
    category: 'Navigation',
    match: function(el) {
      return safeClasses(el).includes('btm-nav');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Bottom Nav Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'size',
          name: 'Bar Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['btm-nav-xs', 'btm-nav-sm', 'btm-nav-md', 'btm-nav-lg'],
          value: ['btm-nav-xs', 'btm-nav-sm', 'btm-nav-md', 'btm-nav-lg'].find(function(c) { return cls.includes(c); }) || 'btm-nav-md',
          options: [
            { label: 'Extra Small', value: 'btm-nav-xs' },
            { label: 'Small', value: 'btm-nav-sm' },
            { label: 'Medium', value: 'btm-nav-md' },
            { label: 'Large', value: 'btm-nav-lg' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // BATCH 5: DATA DISPLAY & FEEDBACK (10 components)
  // ==========================================

  // 53. Table
  Registry.register({
    id: 'table',
    name: 'Data Table',
    category: 'Data Display',
    match: function(el) {
      return getTag(el) === 'table';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Table Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'zebra',
          name: 'Zebra Striping',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['table-zebra'],
          value: cls.includes('table-zebra')
        },
        {
          key: 'pinRows',
          name: 'Pin Header Rows',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['table-pin-rows'],
          value: cls.includes('table-pin-rows')
        },
        {
          key: 'pinCols',
          name: 'Pin Header Columns',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['table-pin-cols'],
          value: cls.includes('table-pin-cols')
        },
        {
          key: 'size',
          name: 'Table Density',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['table-xs', 'table-sm', 'table-md', 'table-lg'],
          value: ['table-xs', 'table-sm', 'table-md', 'table-lg'].find(function(c) { return cls.includes(c); }) || 'table-md',
          options: [
            { label: 'Extra Compact (XS)', value: 'table-xs' },
            { label: 'Compact (SM)', value: 'table-sm' },
            { label: 'Standard (MD)', value: 'table-md' },
            { label: 'Spacious (LG)', value: 'table-lg' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 54. Table Row
  Registry.register({
    id: 'table-row',
    name: 'Table Row',
    category: 'Data Display',
    match: function(el) {
      return getTag(el) === 'tr';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Row Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'hover',
          name: 'Hover Highlight',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['hover'],
          value: cls.includes('hover')
        },
        {
          key: 'active',
          name: 'Selected / Active',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['active'],
          value: cls.includes('active')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 55. Table Cell
  Registry.register({
    id: 'table-cell',
    name: 'Table Cell',
    category: 'Data Display',
    match: function(el) {
      const tag = getTag(el);
      return tag === 'td' || tag === 'th';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Cell Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'text',
          name: 'Cell Content',
          section: 'default',
          type: 'text',
          value: el.innerText || '',
          onChange: function(node, val) { node.innerText = val; }
        },
        {
          key: 'align',
          name: 'Alignment',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['text-left', 'text-center', 'text-right'],
          value: ['text-left', 'text-center', 'text-right'].find(function(c) { return cls.includes(c); }) || 'text-left',
          options: [
            { label: 'Left', value: 'text-left' },
            { label: 'Center', value: 'text-center' },
            { label: 'Right', value: 'text-right' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 56. Progress Bar
  Registry.register({
    id: 'progress',
    name: 'Progress Bar',
    category: 'Data Display',
    match: function(el) {
      return getTag(el) === 'progress' || safeClasses(el).includes('progress');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Progress Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'value',
          name: 'Current Value',
          section: 'default',
          type: 'number',
          htmlAttr: 'value',
          value: Number(el.getAttribute('value') || 50),
          min: 0,
          max: 100
        },
        {
          key: 'max',
          name: 'Max Value',
          section: 'default',
          type: 'number',
          htmlAttr: 'max',
          value: Number(el.getAttribute('max') || 100),
          min: 1,
          max: 1000
        },
        {
          key: 'variant',
          name: 'Color Variant',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['progress-primary', 'progress-secondary', 'progress-accent', 'progress-info', 'progress-success', 'progress-warning', 'progress-error'],
          value: ['progress-primary', 'progress-secondary', 'progress-accent', 'progress-info', 'progress-success', 'progress-warning', 'progress-error'].find(function(c) { return cls.includes(c); }) || 'progress-primary',
          options: [
            { label: 'Primary', value: 'progress-primary' },
            { label: 'Secondary', value: 'progress-secondary' },
            { label: 'Accent', value: 'progress-accent' },
            { label: 'Info', value: 'progress-info' },
            { label: 'Success', value: 'progress-success' },
            { label: 'Warning', value: 'progress-warning' },
            { label: 'Error', value: 'progress-error' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 57. Radial Progress
  Registry.register({
    id: 'radial-progress',
    name: 'Radial Progress',
    category: 'Data Display',
    match: function(el) {
      return safeClasses(el).includes('radial-progress');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Radial Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const style = el.getAttribute('style') || '';
      const valMatch = style.match(/--value:\s*(\d+)/);
      const currentVal = valMatch ? valMatch[1] : (el.innerText.replace('%', '').trim() || '70');
      const props = [
        {
          key: 'percentage',
          name: 'Percentage (0-100)',
          section: 'default',
          type: 'number',
          value: Number(currentVal),
          min: 0,
          max: 100,
          onChange: function(node, val) {
            node.style.setProperty('--value', val);
            node.innerText = val + '%';
          }
        },
        {
          key: 'variant',
          name: 'Color Accent',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['text-primary', 'text-secondary', 'text-accent', 'text-info', 'text-success', 'text-warning', 'text-error'],
          value: ['text-primary', 'text-secondary', 'text-accent', 'text-info', 'text-success', 'text-warning', 'text-error'].find(function(c) { return cls.includes(c); }) || 'text-primary',
          options: [
            { label: 'Primary', value: 'text-primary' },
            { label: 'Secondary', value: 'text-secondary' },
            { label: 'Accent', value: 'text-accent' },
            { label: 'Info', value: 'text-info' },
            { label: 'Success', value: 'text-success' },
            { label: 'Warning', value: 'text-warning' },
            { label: 'Error', value: 'text-error' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 58. Avatar
  Registry.register({
    id: 'avatar',
    name: 'User Avatar',
    category: 'Data Display',
    match: function(el) {
      return safeClasses(el).includes('avatar');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Avatar Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const img = el.querySelector('img');
      const innerWrapper = el.querySelector('.rounded-full, .rounded-xl, .mask') || el;
      const wrapCls = safeClasses(innerWrapper);
      const props = [
        {
          key: 'src',
          name: 'Image URL',
          section: 'default',
          type: 'image',
          value: img ? img.getAttribute('src') : '',
          onChange: function(node, val) {
            const im = node.querySelector('img');
            if (im) im.setAttribute('src', val);
          }
        },
        {
          key: 'size',
          name: 'Avatar Size',
          section: 'default',
          type: 'select',
          value: ['w-8', 'w-12', 'w-16', 'w-24'].find(function(c) { return wrapCls.includes(c); }) || 'w-12',
          options: [
            { label: 'Small (w-8)', value: 'w-8' },
            { label: 'Medium (w-12)', value: 'w-12' },
            { label: 'Large (w-16)', value: 'w-16' },
            { label: 'Extra Large (w-24)', value: 'w-24' }
          ],
          onChange: function(node, val) {
            const wrap = node.querySelector('.rounded-full, .rounded-xl, .mask, div') || node;
            ['w-8', 'w-12', 'w-16', 'w-24'].forEach(function(c) { wrap.classList.remove(c); });
            wrap.classList.add(val);
          }
        },
        {
          key: 'status',
          name: 'Status Indicator',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['online', 'offline'],
          value: ['online', 'offline'].find(function(c) { return cls.includes(c); }) || 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Online (Green)', value: 'online' },
            { label: 'Offline (Gray)', value: 'offline' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 59. Figure & Caption
  Registry.register({
    id: 'figure',
    name: 'Figure & Caption',
    category: 'Data Display',
    match: function(el) {
      return getTag(el) === 'figure';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Figure Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const img = el.querySelector('img');
      const caption = el.querySelector('figcaption');
      const props = [
        {
          key: 'imgSrc',
          name: 'Image URL',
          section: 'default',
          type: 'image',
          value: img ? img.getAttribute('src') : '',
          onChange: function(node, val) {
            const im = node.querySelector('img');
            if (im) im.setAttribute('src', val);
          }
        },
        {
          key: 'caption',
          name: 'Caption Text',
          section: 'default',
          type: 'text',
          value: caption ? caption.innerText : '',
          onChange: function(node, val) {
            let cap = node.querySelector('figcaption');
            if (!cap) {
              cap = document.createElement('figcaption');
              node.appendChild(cap);
            }
            cap.innerText = val;
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 60. Tooltip
  Registry.register({
    id: 'tooltip',
    name: 'Tooltip Element',
    category: 'Data Display',
    match: function(el) {
      return safeClasses(el).includes('tooltip') || el.hasAttribute('data-tip');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Tooltip Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'tip',
          name: 'Tooltip Content',
          section: 'default',
          type: 'text',
          htmlAttr: 'data-tip',
          value: el.getAttribute('data-tip') || ''
        },
        {
          key: 'direction',
          name: 'Direction',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['tooltip-top', 'tooltip-bottom', 'tooltip-left', 'tooltip-right'],
          value: ['tooltip-top', 'tooltip-bottom', 'tooltip-left', 'tooltip-right'].find(function(c) { return cls.includes(c); }) || 'tooltip-top',
          options: [
            { label: 'Top', value: 'tooltip-top' },
            { label: 'Bottom', value: 'tooltip-bottom' },
            { label: 'Left', value: 'tooltip-left' },
            { label: 'Right', value: 'tooltip-right' }
          ]
        },
        {
          key: 'variant',
          name: 'Color Tone',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['tooltip-primary', 'tooltip-secondary', 'tooltip-accent', 'tooltip-info', 'tooltip-success', 'tooltip-warning', 'tooltip-error'],
          value: ['tooltip-primary', 'tooltip-secondary', 'tooltip-accent', 'tooltip-info', 'tooltip-success', 'tooltip-warning', 'tooltip-error'].find(function(c) { return cls.includes(c); }) || 'none',
          options: [
            { label: 'Default', value: 'none' },
            { label: 'Primary', value: 'tooltip-primary' },
            { label: 'Secondary', value: 'tooltip-secondary' },
            { label: 'Accent', value: 'tooltip-accent' },
            { label: 'Info', value: 'tooltip-info' },
            { label: 'Success', value: 'tooltip-success' },
            { label: 'Warning', value: 'tooltip-warning' },
            { label: 'Error', value: 'tooltip-error' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 61. Modal Dialog
  Registry.register({
    id: 'modal',
    name: 'Modal Dialog',
    category: 'Data Display',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'dialog' || cls.includes('modal');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Modal Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'position',
          name: 'Dialog Position',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['modal-middle', 'modal-bottom'],
          value: cls.includes('modal-bottom') ? 'modal-bottom' : 'modal-middle',
          options: [
            { label: 'Middle (Centered)', value: 'modal-middle' },
            { label: 'Bottom (Mobile Drawer)', value: 'modal-bottom' }
          ]
        },
        {
          key: 'open',
          name: 'Modal Open State',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'class',
          validValues: ['modal-open'],
          value: cls.includes('modal-open')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 62. Stat Metric Item
  Registry.register({
    id: 'stat',
    name: 'Stat Metric Item',
    category: 'Data Display',
    match: function(el) {
      return safeClasses(el).includes('stat');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Metric Content' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const titleEl = el.querySelector('.stat-title');
      const valEl = el.querySelector('.stat-value');
      const descEl = el.querySelector('.stat-desc');
      const props = [
        {
          key: 'title',
          name: 'Metric Label / Title',
          section: 'default',
          type: 'text',
          value: titleEl ? titleEl.innerText : 'Total Revenue',
          onChange: function(node, val) {
            let t = node.querySelector('.stat-title');
            if (t) t.innerText = val;
          }
        },
        {
          key: 'val',
          name: 'Metric Value',
          section: 'default',
          type: 'text',
          value: valEl ? valEl.innerText : '$89,400',
          onChange: function(node, val) {
            let v = node.querySelector('.stat-value');
            if (v) v.innerText = val;
          }
        },
        {
          key: 'desc',
          name: 'Description Note',
          section: 'default',
          type: 'text',
          value: descEl ? descEl.innerText : '21% more than last month',
          onChange: function(node, val) {
            let d = node.querySelector('.stat-desc');
            if (d) d.innerText = val;
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // BATCH 6: MEDIA & INTERACTIVE (10 components)
  // ==========================================

  // 63. Video Player
  Registry.register({
    id: 'video',
    name: 'HTML5 Video',
    category: 'Media & Interactive',
    match: function(el) {
      return getTag(el) === 'video';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Video Player Settings' },
        { id: 'playback', header: 'Playback Controls' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'src',
          name: 'Video Source URL',
          section: 'default',
          type: 'text',
          htmlAttr: 'src',
          value: el.getAttribute('src') || ''
        },
        {
          key: 'aspect',
          name: 'Aspect Ratio',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['aspect-video', 'aspect-square', 'aspect-auto'],
          value: ['aspect-video', 'aspect-square', 'aspect-auto'].find(function(c) { return cls.includes(c); }) || 'aspect-video',
          options: [
            { label: 'Widescreen 16:9 (aspect-video)', value: 'aspect-video' },
            { label: 'Square 1:1', value: 'aspect-square' },
            { label: 'Auto Natural', value: 'aspect-auto' }
          ]
        },
        {
          key: 'controls',
          name: 'Player Controls',
          section: 'playback',
          type: 'toggle',
          htmlAttr: 'controls',
          value: el.hasAttribute('controls')
        },
        {
          key: 'autoplay',
          name: 'Autoplay',
          section: 'playback',
          type: 'toggle',
          htmlAttr: 'autoplay',
          value: el.hasAttribute('autoplay')
        },
        {
          key: 'loop',
          name: 'Loop Playback',
          section: 'playback',
          type: 'toggle',
          htmlAttr: 'loop',
          value: el.hasAttribute('loop')
        },
        {
          key: 'muted',
          name: 'Muted',
          section: 'playback',
          type: 'toggle',
          htmlAttr: 'muted',
          value: el.hasAttribute('muted')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 64. Audio Player
  Registry.register({
    id: 'audio',
    name: 'HTML5 Audio',
    category: 'Media & Interactive',
    match: function(el) {
      return getTag(el) === 'audio';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Audio Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const props = [
        {
          key: 'src',
          name: 'Audio URL',
          section: 'default',
          type: 'text',
          htmlAttr: 'src',
          value: el.getAttribute('src') || ''
        },
        {
          key: 'controls',
          name: 'Show Controls',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'controls',
          value: el.hasAttribute('controls')
        },
        {
          key: 'autoplay',
          name: 'Autoplay',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'autoplay',
          value: el.hasAttribute('autoplay')
        },
        {
          key: 'loop',
          name: 'Loop',
          section: 'default',
          type: 'toggle',
          htmlAttr: 'loop',
          value: el.hasAttribute('loop')
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 65. Responsive Iframe
  Registry.register({
    id: 'iframe',
    name: 'Embed Iframe',
    category: 'Media & Interactive',
    match: function(el) {
      return getTag(el) === 'iframe';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Iframe Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'src',
          name: 'Source URL',
          section: 'default',
          type: 'text',
          htmlAttr: 'src',
          value: el.getAttribute('src') || ''
        },
        {
          key: 'title',
          name: 'Frame Title',
          section: 'default',
          type: 'text',
          htmlAttr: 'title',
          value: el.getAttribute('title') || ''
        },
        {
          key: 'aspect',
          name: 'Aspect Ratio',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['aspect-video', 'aspect-square', 'h-96 w-full'],
          value: ['aspect-video', 'aspect-square', 'h-96 w-full'].find(function(c) { return cls.includes(c); }) || 'aspect-video',
          options: [
            { label: 'Widescreen (16:9)', value: 'aspect-video' },
            { label: 'Square (1:1)', value: 'aspect-square' },
            { label: 'Fixed Height (384px)', value: 'h-96 w-full' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 66. Media Embed Container
  Registry.register({
    id: 'embed',
    name: 'Responsive Embed Container',
    category: 'Media & Interactive',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('embed-responsive') || (cls.includes('aspect-video') && !getTag(el).match(/video|iframe/));
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Embed Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'aspect',
          name: 'Aspect Ratio',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['aspect-video', 'aspect-square', 'aspect-4/3'],
          value: ['aspect-video', 'aspect-square', 'aspect-4/3'].find(function(c) { return cls.includes(c); }) || 'aspect-video',
          options: [
            { label: '16:9 Widescreen', value: 'aspect-video' },
            { label: '4:3 Standard', value: 'aspect-4/3' },
            { label: '1:1 Square', value: 'aspect-square' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 67. Gallery Grid
  Registry.register({
    id: 'gallery',
    name: 'Photo Gallery Grid',
    category: 'Media & Interactive',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('gallery') || (cls.includes('grid') && el.querySelectorAll('img').length >= 3);
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Gallery Layout' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'cols',
          name: 'Grid Columns',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-6'],
          value: ['grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-6'].find(function(c) { return cls.includes(c); }) || 'grid-cols-3',
          options: [
            { label: '2 Columns', value: 'grid-cols-2' },
            { label: '3 Columns', value: 'grid-cols-3' },
            { label: '4 Columns', value: 'grid-cols-4' },
            { label: '6 Columns', value: 'grid-cols-6' }
          ]
        },
        {
          key: 'gap',
          name: 'Photo Gap',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['gap-1', 'gap-2', 'gap-4', 'gap-6'],
          value: ['gap-1', 'gap-2', 'gap-4', 'gap-6'].find(function(c) { return cls.includes(c); }) || 'gap-4',
          options: [
            { label: 'Compact (1)', value: 'gap-1' },
            { label: 'Standard (2)', value: 'gap-2' },
            { label: 'Medium (4)', value: 'gap-4' },
            { label: 'Spacious (6)', value: 'gap-6' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 68. Carousel
  Registry.register({
    id: 'carousel',
    name: 'Media Carousel',
    category: 'Media & Interactive',
    match: function(el) {
      return safeClasses(el).includes('carousel');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Carousel Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'snap',
          name: 'Snap Alignment',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['carousel-center', 'carousel-start', 'carousel-end'],
          value: ['carousel-center', 'carousel-start', 'carousel-end'].find(function(c) { return cls.includes(c); }) || 'carousel-center',
          options: [
            { label: 'Center Snap', value: 'carousel-center' },
            { label: 'Start Snap', value: 'carousel-start' },
            { label: 'End Snap', value: 'carousel-end' }
          ]
        },
        {
          key: 'orientation',
          name: 'Direction',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['carousel-vertical', 'carousel-horizontal'],
          value: cls.includes('carousel-vertical') ? 'carousel-vertical' : 'carousel-horizontal',
          options: [
            { label: 'Horizontal (Slide across)', value: 'carousel-horizontal' },
            { label: 'Vertical (Slide up/down)', value: 'carousel-vertical' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 69. Social Icons
  Registry.register({
    id: 'social-icons',
    name: 'Social Media Icons',
    category: 'Media & Interactive',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('social-icons') || (cls.includes('flex') && el.querySelector('iconify-icon[icon*="social"], iconify-icon[icon*="facebook"], iconify-icon[icon*="twitter"], iconify-icon[icon*="github"]'));
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Icon Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'gap',
          name: 'Icon Spacing',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['gap-1', 'gap-2', 'gap-3', 'gap-4'],
          value: ['gap-1', 'gap-2', 'gap-3', 'gap-4'].find(function(c) { return cls.includes(c); }) || 'gap-2',
          options: [
            { label: 'Compact', value: 'gap-1' },
            { label: 'Normal', value: 'gap-2' },
            { label: 'Relaxed', value: 'gap-3' },
            { label: 'Wide', value: 'gap-4' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 70. Favicon Link
  Registry.register({
    id: 'favicon',
    name: 'Favicon Icon',
    category: 'Media & Interactive',
    match: function(el) {
      return getTag(el) === 'link' && el.getAttribute('rel') === 'icon';
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Favicon Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const props = [
        {
          key: 'href',
          name: 'Icon URL',
          section: 'default',
          type: 'text',
          htmlAttr: 'href',
          value: el.getAttribute('href') || ''
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 71. Image Box / Feature Media Block
  Registry.register({
    id: 'image-box',
    name: 'Feature Image Box',
    category: 'Media & Interactive',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('image-box') || (cls.includes('flex') && el.querySelector('img') && el.querySelector('h1, h2, h3, h4, h5, h6'));
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Feature Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const heading = el.querySelector('h1, h2, h3, h4, h5, h6');
      const paragraph = el.querySelector('p');
      const img = el.querySelector('img');
      const props = [
        {
          key: 'title',
          name: 'Feature Title',
          section: 'default',
          type: 'text',
          value: heading ? heading.innerText : '',
          onChange: function(node, val) {
            const h = node.querySelector('h1, h2, h3, h4, h5, h6');
            if (h) h.innerText = val;
          }
        },
        {
          key: 'desc',
          name: 'Feature Description',
          section: 'default',
          type: 'textarea',
          value: paragraph ? paragraph.innerText : '',
          onChange: function(node, val) {
            const p = node.querySelector('p');
            if (p) p.innerText = val;
          }
        },
        {
          key: 'img',
          name: 'Media Image',
          section: 'default',
          type: 'image',
          value: img ? img.getAttribute('src') : '',
          onChange: function(node, val) {
            const im = node.querySelector('img');
            if (im) im.setAttribute('src', val);
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 72. Testimonial Card
  Registry.register({
    id: 'testimonial',
    name: 'Testimonial Card',
    category: 'Media & Interactive',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('testimonial') || (cls.includes('card') && el.querySelector('blockquote, .quote'));
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Testimonial Content' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const quoteEl = el.querySelector('blockquote, p');
      const authorEl = el.querySelector('cite, .font-bold, h4');
      const roleEl = el.querySelector('.opacity-60, .text-xs, small');
      const props = [
        {
          key: 'quote',
          name: 'Testimonial Quote',
          section: 'default',
          type: 'textarea',
          value: quoteEl ? quoteEl.innerText : '',
          onChange: function(node, val) {
            const q = node.querySelector('blockquote, p');
            if (q) q.innerText = val;
          }
        },
        {
          key: 'author',
          name: 'Author Name',
          section: 'default',
          type: 'text',
          value: authorEl ? authorEl.innerText : '',
          onChange: function(node, val) {
            const a = node.querySelector('cite, .font-bold, h4');
            if (a) a.innerText = val;
          }
        },
        {
          key: 'role',
          name: 'Author Title / Company',
          section: 'default',
          type: 'text',
          value: roleEl ? roleEl.innerText : '',
          onChange: function(node, val) {
            const r = node.querySelector('.opacity-60, .text-xs, small');
            if (r) r.innerText = val;
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // BATCH 7: ADVANCED ELEMENTS (10 components)
  // ==========================================

  // 73. Animated Number Counter
  Registry.register({
    id: 'counter',
    name: 'Number Counter',
    category: 'Advanced Elements',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('counter') || (cls.includes('countdown') || (cls.includes('font-mono') && cls.includes('text-4xl')));
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Counter Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'val',
          name: 'Counter Value',
          section: 'default',
          type: 'text',
          value: el.innerText || '100',
          onChange: function(node, val) { node.innerText = val; }
        },
        {
          key: 'size',
          name: 'Text Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['text-2xl', 'text-4xl', 'text-5xl', 'text-6xl'],
          value: ['text-2xl', 'text-4xl', 'text-5xl', 'text-6xl'].find(function(c) { return cls.includes(c); }) || 'text-4xl',
          options: [
            { label: 'Medium (2XL)', value: 'text-2xl' },
            { label: 'Large (4XL)', value: 'text-4xl' },
            { label: 'Hero (5XL)', value: 'text-5xl' },
            { label: 'Giant (6XL)', value: 'text-6xl' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 74. Icon List
  Registry.register({
    id: 'icon-list',
    name: 'Icon Bullet List',
    category: 'Advanced Elements',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('icon-list') || (cls.includes('space-y-2') && el.querySelector('iconify-icon, svg'));
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Icon List Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'spacing',
          name: 'Item Spacing',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['space-y-1', 'space-y-2', 'space-y-3', 'space-y-4'],
          value: ['space-y-1', 'space-y-2', 'space-y-3', 'space-y-4'].find(function(c) { return cls.includes(c); }) || 'space-y-2',
          options: [
            { label: 'Tight', value: 'space-y-1' },
            { label: 'Standard', value: 'space-y-2' },
            { label: 'Relaxed', value: 'space-y-3' },
            { label: 'Spacious', value: 'space-y-4' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 75. Animated Headline
  Registry.register({
    id: 'animated-headline',
    name: 'Animated Headline',
    category: 'Advanced Elements',
    match: function(el) {
      return safeClasses(el).includes('animated-headline');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Headline Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const props = [
        {
          key: 'text',
          name: 'Headline Text',
          section: 'default',
          type: 'text',
          value: el.innerText || '',
          onChange: function(node, val) { node.innerText = val; }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 76. Price Table Card
  Registry.register({
    id: 'price-table',
    name: 'Pricing Card',
    category: 'Advanced Elements',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('pricing-card') || (cls.includes('card') && el.querySelector('.price, .text-4xl'));
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Pricing Plan' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const titleEl = el.querySelector('h2, h3, .card-title');
      const priceEl = el.querySelector('.price, .text-4xl, .text-3xl');
      const btnEl = el.querySelector('.btn');
      const props = [
        {
          key: 'planName',
          name: 'Plan Name',
          section: 'default',
          type: 'text',
          value: titleEl ? titleEl.innerText : 'Pro Plan',
          onChange: function(node, val) {
            const t = node.querySelector('h2, h3, .card-title');
            if (t) t.innerText = val;
          }
        },
        {
          key: 'price',
          name: 'Price Tag',
          section: 'default',
          type: 'text',
          value: priceEl ? priceEl.innerText : '$29/mo',
          onChange: function(node, val) {
            const p = node.querySelector('.price, .text-4xl, .text-3xl');
            if (p) p.innerText = val;
          }
        },
        {
          key: 'cta',
          name: 'Call to Action Button',
          section: 'default',
          type: 'text',
          value: btnEl ? btnEl.innerText : 'Get Started',
          onChange: function(node, val) {
            const b = node.querySelector('.btn');
            if (b) b.innerText = val;
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 77. Price List Item
  Registry.register({
    id: 'price-list',
    name: 'Price List Item',
    category: 'Advanced Elements',
    match: function(el) {
      return safeClasses(el).includes('price-list-item');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Item Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const itemEl = el.querySelector('.item-name') || el;
      const priceEl = el.querySelector('.item-price');
      const props = [
        {
          key: 'name',
          name: 'Item Name',
          section: 'default',
          type: 'text',
          value: itemEl.innerText || '',
          onChange: function(node, val) {
            const n = node.querySelector('.item-name') || node;
            n.innerText = val;
          }
        },
        {
          key: 'price',
          name: 'Price',
          section: 'default',
          type: 'text',
          value: priceEl ? priceEl.innerText : '$10.00',
          onChange: function(node, val) {
            const p = node.querySelector('.item-price');
            if (p) p.innerText = val;
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 78. Customer Reviews Card
  Registry.register({
    id: 'reviews',
    name: 'Customer Review',
    category: 'Advanced Elements',
    match: function(el) {
      return safeClasses(el).includes('review-card') || (safeClasses(el).includes('card') && el.querySelector('.rating'));
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Review Details' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const authorEl = el.querySelector('.author, h4, .font-bold');
      const textEl = el.querySelector('.review-text, p');
      const props = [
        {
          key: 'author',
          name: 'Reviewer Name',
          section: 'default',
          type: 'text',
          value: authorEl ? authorEl.innerText : 'Jane Doe',
          onChange: function(node, val) {
            const a = node.querySelector('.author, h4, .font-bold');
            if (a) a.innerText = val;
          }
        },
        {
          key: 'text',
          name: 'Review Content',
          section: 'default',
          type: 'textarea',
          value: textEl ? textEl.innerText : 'Outstanding tool and exceptional support!',
          onChange: function(node, val) {
            const t = node.querySelector('.review-text, p');
            if (t) t.innerText = val;
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 79. Flip Box (3D Flip Card)
  Registry.register({
    id: 'flip-box',
    name: '3D Flip Card',
    category: 'Advanced Elements',
    match: function(el) {
      return safeClasses(el).includes('flip-card') || safeClasses(el).includes('flip-box');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Flip Box Content' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const front = el.querySelector('.flip-front') || el.firstElementChild;
      const back = el.querySelector('.flip-back') || el.lastElementChild;
      const props = [
        {
          key: 'frontText',
          name: 'Front Content',
          section: 'default',
          type: 'text',
          value: front ? front.innerText : 'Front Side',
          onChange: function(node, val) {
            const f = node.querySelector('.flip-front') || node.firstElementChild;
            if (f) f.innerText = val;
          }
        },
        {
          key: 'backText',
          name: 'Back Content',
          section: 'default',
          type: 'text',
          value: back ? back.innerText : 'Back Side',
          onChange: function(node, val) {
            const b = node.querySelector('.flip-back') || node.lastElementChild;
            if (b) b.innerText = val;
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 80. Image Compare / Diff Slider
  Registry.register({
    id: 'image-compare',
    name: 'Image Diff / Comparison',
    category: 'Advanced Elements',
    match: function(el) {
      return safeClasses(el).includes('diff');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Diff Images' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const item1 = el.querySelector('.diff-item-1 img');
      const item2 = el.querySelector('.diff-item-2 img');
      const props = [
        {
          key: 'img1',
          name: 'Before Image (1)',
          section: 'default',
          type: 'image',
          value: item1 ? item1.getAttribute('src') : '',
          onChange: function(node, val) {
            const i1 = node.querySelector('.diff-item-1 img');
            if (i1) i1.setAttribute('src', val);
          }
        },
        {
          key: 'img2',
          name: 'After Image (2)',
          section: 'default',
          type: 'image',
          value: item2 ? item2.getAttribute('src') : '',
          onChange: function(node, val) {
            const i2 = node.querySelector('.diff-item-2 img');
            if (i2) i2.setAttribute('src', val);
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 81. Rating Stars
  Registry.register({
    id: 'rating-stars',
    name: 'Rating Stars',
    category: 'Advanced Elements',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('rating') && !cls.includes('stat');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Rating Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const props = [
        {
          key: 'size',
          name: 'Star Size',
          section: 'default',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['rating-xs', 'rating-sm', 'rating-md', 'rating-lg'],
          value: ['rating-xs', 'rating-sm', 'rating-md', 'rating-lg'].find(function(c) { return cls.includes(c); }) || 'rating-sm',
          options: [
            { label: 'Extra Small', value: 'rating-xs' },
            { label: 'Small', value: 'rating-sm' },
            { label: 'Medium', value: 'rating-md' },
            { label: 'Large', value: 'rating-lg' }
          ]
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 82. Accordion Container
  Registry.register({
    id: 'accordion',
    name: 'Accordion Group',
    category: 'Advanced Elements',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('join-vertical') && el.querySelector('.collapse');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Accordion Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const props = [
        {
          key: 'arrowStyle',
          name: 'Indicator Arrow',
          section: 'default',
          type: 'toggle',
          value: true,
          onChange: function(node, val) {
            node.querySelectorAll('.collapse').forEach(function(c) {
              c.classList.toggle('collapse-arrow', val);
            });
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // ==========================================
  // BATCH 8: WIDGETS & INTEGRATIONS (5 components)
  // ==========================================

  // 83. Google Maps Embed
  Registry.register({
    id: 'google-maps',
    name: 'Google Maps',
    category: 'Widgets',
    match: function(el) {
      const tag = getTag(el);
      const src = el.getAttribute('src') || '';
      return tag === 'iframe' && src.includes('google.com/maps');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Map Configuration' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const props = [
        {
          key: 'query',
          name: 'Location / Query',
          section: 'default',
          type: 'text',
          value: 'San Francisco, CA',
          onChange: function(node, val) {
            node.setAttribute('src', 'https://maps.google.com/maps?q=' + encodeURIComponent(val) + '&t=&z=13&ie=UTF8&iwloc=&output=embed');
          }
        },
        {
          key: 'height',
          name: 'Map Height (px)',
          section: 'default',
          type: 'number',
          value: Number(el.getAttribute('height') || 350),
          min: 150,
          max: 1000,
          onChange: function(node, val) {
            node.setAttribute('height', val);
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 84. Embed Video (YouTube / Vimeo)
  Registry.register({
    id: 'embed-video',
    name: 'YouTube / Vimeo Embed',
    category: 'Widgets',
    match: function(el) {
      const src = el.getAttribute('src') || '';
      return getTag(el) === 'iframe' && (src.includes('youtube') || src.includes('vimeo') || src.includes('youtu.be'));
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Video Embed Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const props = [
        {
          key: 'src',
          name: 'Embed URL',
          section: 'default',
          type: 'text',
          htmlAttr: 'src',
          value: el.getAttribute('src') || ''
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 85. Facebook Comments
  Registry.register({
    id: 'facebook-comments',
    name: 'Facebook Comments',
    category: 'Widgets',
    match: function(el) {
      return safeClasses(el).includes('fb-comments') || el.hasAttribute('data-numposts');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Comments Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const props = [
        {
          key: 'href',
          name: 'Target URL',
          section: 'default',
          type: 'text',
          htmlAttr: 'data-href',
          value: el.getAttribute('data-href') || window.location.href
        },
        {
          key: 'numposts',
          name: 'Number of Posts',
          section: 'default',
          type: 'number',
          htmlAttr: 'data-numposts',
          value: Number(el.getAttribute('data-numposts') || 5),
          min: 1,
          max: 50
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 86. Twitter Feed
  Registry.register({
    id: 'twitter-feed',
    name: 'Twitter / X Timeline',
    category: 'Widgets',
    match: function(el) {
      return safeClasses(el).includes('twitter-timeline') || el.getAttribute('data-widget-id');
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Timeline Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const props = [
        {
          key: 'handle',
          name: 'Twitter Handle',
          section: 'default',
          type: 'text',
          value: el.innerText.replace('@', '') || 'tailwindlabs',
          onChange: function(node, val) {
            node.innerText = '@' + val;
            node.setAttribute('href', 'https://twitter.com/' + val);
          }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // 87. PayPal Button
  Registry.register({
    id: 'paypal-button',
    name: 'PayPal Action Button',
    category: 'Widgets',
    match: function(el) {
      return safeClasses(el).includes('paypal-button') || el.getAttribute('data-paypal-button') !== null;
    },
    getSections: function() {
      return [
        { id: 'default', header: 'Payment Settings' },
        { id: 'general', header: 'General' }
      ];
    },
    getProperties: function(el) {
      const props = [
        {
          key: 'label',
          name: 'Button Label',
          section: 'default',
          type: 'text',
          value: el.innerText || 'Pay with PayPal',
          onChange: function(node, val) { node.innerText = val; }
        },
        {
          key: 'merchantId',
          name: 'Merchant Account / Email',
          section: 'default',
          type: 'text',
          value: el.getAttribute('data-merchant-id') || '',
          onChange: function(node, val) { node.setAttribute('data-merchant-id', val); }
        }
      ];
      return props.concat(getBaseGeneralProps(el));
    }
  });

  // Expose to window and dispatch readiness event
  window.NexusBuilderComponents = Registry;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexus:builder-components-ready', { detail: Registry }));
  }

})();
