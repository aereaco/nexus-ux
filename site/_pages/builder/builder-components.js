// Nexus Builder Component Registry & Dynamic Property Schema Engine
// Aligned with VvvebJs dynamic component property architecture & DaisyUI 5 / Tailwind CSS
(function() {
  'use strict';

  function safeClasses(el) {
    return el && el.className ? el.className.split(/\s+/).filter(Boolean) : [];
  }

  function getTag(el) {
    return el && el.tagName ? el.tagName.toLowerCase() : '';
  }

  const Registry = {
    components: [],

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
        getProperties: function(target) {
          const props = [];
          if (isText) {
            props.push({
              key: 'textContent',
              name: 'Text Content',
              type: 'textarea',
              value: target.textContent || '',
              onChange: function(node, val) { node.textContent = val; }
            });
          }
          return props;
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
  // CATEGORY 1: BUTTONS & ACTIONS
  // ==========================================

  // 1. Button
  Registry.register({
    id: 'btn',
    name: 'Button',
    category: 'Buttons & Actions',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return (tag === 'button' || (tag === 'a' && cls.includes('btn')) || cls.includes('btn')) && !cls.includes('btn-group');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const tag = getTag(el);
      return [
        {
          key: 'text',
          name: 'Text Content',
          type: 'text',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'variant',
          name: 'Color Variant',
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
            { label: 'Ghost', value: 'btn-ghost' },
            { label: 'Link', value: 'btn-link' }
          ]
        },
        {
          key: 'style',
          name: 'Style Modifier',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['btn-outline', 'btn-soft', 'btn-dash', 'glass'],
          value: ['btn-outline', 'btn-soft', 'btn-dash', 'glass'].find(s => cls.includes(s)) || 'none',
          options: [
            { label: 'Solid (Default)', value: 'none' },
            { label: 'Outline', value: 'btn-outline' },
            { label: 'Soft', value: 'btn-soft' },
            { label: 'Dashed', value: 'btn-dash' },
            { label: 'Glassmorphism', value: 'glass' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['btn-xs', 'btn-sm', 'btn-md', 'btn-lg', 'btn-xl'],
          value: ['btn-xs', 'btn-sm', 'btn-md', 'btn-lg', 'btn-xl'].find(s => cls.includes(s)) || 'btn-md',
          options: [
            { label: 'XS', value: 'btn-xs' },
            { label: 'SM', value: 'btn-sm' },
            { label: 'MD', value: 'btn-md' },
            { label: 'LG', value: 'btn-lg' },
            { label: 'XL', value: 'btn-xl' }
          ]
        },
        {
          key: 'shape',
          name: 'Shape',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['btn-wide', 'btn-block', 'btn-circle', 'btn-square'],
          value: ['btn-wide', 'btn-block', 'btn-circle', 'btn-square'].find(s => cls.includes(s)) || 'none',
          options: [
            { label: 'Standard', value: 'none' },
            { label: 'Wide', value: 'btn-wide' },
            { label: 'Full Block', value: 'btn-block' },
            { label: 'Circle', value: 'btn-circle' },
            { label: 'Square', value: 'btn-square' }
          ]
        },
        {
          key: 'isLink',
          name: 'Link Target (Href)',
          type: 'text',
          value: tag === 'a' ? (el.getAttribute('href') || '') : '',
          onChange: function(node, val) {
            if (val) {
              node.setAttribute('href', val);
            } else if (node.tagName.toLowerCase() === 'a') {
              node.removeAttribute('href');
            }
          }
        },
        {
          key: 'disabled',
          name: 'Disabled',
          type: 'toggle',
          value: el.hasAttribute('disabled') || cls.includes('btn-disabled'),
          onChange: function(node, val) {
            if (val) {
              node.setAttribute('disabled', '');
              node.classList.add('btn-disabled');
            } else {
              node.removeAttribute('disabled');
              node.classList.remove('btn-disabled');
            }
          }
        }
      ];
    }
  });

  // 2. Button Group / Join
  Registry.register({
    id: 'btn-group',
    name: 'Button Group (Join)',
    category: 'Buttons & Actions',
    match: function(el) {
      const cls = safeClasses(el);
      return (cls.includes('join') || cls.includes('btn-group')) && el.querySelector('.btn');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'direction',
          name: 'Orientation',
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
    }
  });

  // ==========================================
  // CATEGORY 2: TYPOGRAPHY & STRUCTURE
  // ==========================================

  // 3. Heading
  Registry.register({
    id: 'heading',
    name: 'Heading',
    category: 'Typography & Structure',
    match: function(el) {
      return ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(getTag(el));
    },
    getProperties: function(el) {
      const tag = getTag(el);
      return [
        {
          key: 'level',
          name: 'Heading Level',
          type: 'select',
          value: tag.toUpperCase(),
          options: [
            { label: 'H1 - Page Main Title', value: 'H1' },
            { label: 'H2 - Section Header', value: 'H2' },
            { label: 'H3 - Subtitle / Group', value: 'H3' },
            { label: 'H4 - Minor Heading', value: 'H4' },
            { label: 'H5 - Small Title', value: 'H5' },
            { label: 'H6 - Micro Header', value: 'H6' }
          ],
          onChange: function(node, val) {
            const newTag = val.toLowerCase();
            if (node.tagName.toLowerCase() === newTag) return;
            const replacement = node.ownerDocument.createElement(newTag);
            replacement.innerHTML = node.innerHTML;
            for (let a of node.attributes) replacement.setAttribute(a.name, a.value);
            node.parentNode.replaceChild(replacement, node);
          }
        },
        {
          key: 'text',
          name: 'Text Content',
          type: 'textarea',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        }
      ];
    }
  });

  // 4. Blockquote
  Registry.register({
    id: 'blockquote',
    name: 'Blockquote',
    category: 'Typography & Structure',
    match: function(el) {
      return getTag(el) === 'blockquote' || safeClasses(el).includes('blockquote');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'text',
          name: 'Quote Text',
          type: 'textarea',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'borderVariant',
          name: 'Accent Border',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['border-primary', 'border-secondary', 'border-accent', 'border-neutral', 'border-base-content/20'],
          value: ['border-primary', 'border-secondary', 'border-accent', 'border-neutral'].find(v => cls.includes(v)) || 'border-primary',
          options: [
            { label: 'Primary', value: 'border-primary' },
            { label: 'Secondary', value: 'border-secondary' },
            { label: 'Accent', value: 'border-accent' },
            { label: 'Neutral', value: 'border-neutral' },
            { label: 'Subtle', value: 'border-base-content/20' }
          ]
        }
      ];
    }
  });

  // 5. Divider
  Registry.register({
    id: 'divider',
    name: 'Divider',
    category: 'Typography & Structure',
    match: function(el) {
      return safeClasses(el).includes('divider') || getTag(el) === 'hr';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'text',
          name: 'Divider Label',
          type: 'text',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'orientation',
          name: 'Orientation',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['divider-horizontal', 'divider-vertical'],
          value: cls.includes('divider-horizontal') ? 'divider-horizontal' : 'divider-vertical',
          options: [
            { label: 'Vertical (Row)', value: 'divider-vertical' },
            { label: 'Horizontal (Col)', value: 'divider-horizontal' }
          ]
        },
        {
          key: 'variant',
          name: 'Color Variant',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['divider-primary', 'divider-secondary', 'divider-accent', 'divider-neutral', 'divider-success', 'divider-warning', 'divider-error'],
          value: ['divider-primary', 'divider-secondary', 'divider-accent', 'divider-neutral', 'divider-success', 'divider-warning', 'divider-error'].find(v => cls.includes(v)) || 'none',
          options: [
            { label: 'Default', value: 'none' },
            { label: 'Primary', value: 'divider-primary' },
            { label: 'Secondary', value: 'divider-secondary' },
            { label: 'Accent', value: 'divider-accent' },
            { label: 'Neutral', value: 'divider-neutral' }
          ]
        }
      ];
    }
  });

  // 6. Badge
  Registry.register({
    id: 'badge',
    name: 'Badge',
    category: 'Typography & Structure',
    match: function(el) {
      return safeClasses(el).includes('badge');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'text',
          name: 'Badge Text',
          type: 'text',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'variant',
          name: 'Color Variant',
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
            { label: 'Success', value: 'badge-success' },
            { label: 'Warning', value: 'badge-warning' },
            { label: 'Error', value: 'badge-error' },
            { label: 'Ghost', value: 'badge-ghost' }
          ]
        },
        {
          key: 'style',
          name: 'Style Modifier',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['badge-outline', 'badge-soft', 'badge-dash'],
          value: ['badge-outline', 'badge-soft', 'badge-dash'].find(s => cls.includes(s)) || 'none',
          options: [
            { label: 'Solid', value: 'none' },
            { label: 'Outline', value: 'badge-outline' },
            { label: 'Soft', value: 'badge-soft' },
            { label: 'Dashed', value: 'badge-dash' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['badge-xs', 'badge-sm', 'badge-md', 'badge-lg', 'badge-xl'],
          value: ['badge-xs', 'badge-sm', 'badge-md', 'badge-lg', 'badge-xl'].find(s => cls.includes(s)) || 'badge-md',
          options: [
            { label: 'XS', value: 'badge-xs' },
            { label: 'SM', value: 'badge-sm' },
            { label: 'MD', value: 'badge-md' },
            { label: 'LG', value: 'badge-lg' }
          ]
        }
      ];
    }
  });

  // ==========================================
  // CATEGORY 3: LAYOUT & CONTAINERS
  // ==========================================

  // 7. Section / Shell / Hero
  Registry.register({
    id: 'section',
    name: 'Section / Hero Shell',
    category: 'Layout & Containers',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return ['section', 'header', 'footer'].includes(tag) || cls.includes('hero') || el.hasAttribute('data-section');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'label',
          name: 'Section Name / Label',
          type: 'text',
          value: el.getAttribute('aria-label') || el.id || '',
          htmlAttr: 'aria-label'
        },
        {
          key: 'width',
          name: 'Container Width',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['w-full', 'max-w-7xl', 'mx-auto'],
          value: cls.includes('w-full') ? 'w-full' : 'max-w-7xl mx-auto',
          options: [
            { label: 'Boxed', value: 'max-w-7xl mx-auto' },
            { label: 'Full Width', value: 'w-full' }
          ]
        },
        {
          key: 'height',
          name: 'Min Height',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['min-h-screen', 'h-auto'],
          value: cls.includes('min-h-screen') ? 'min-h-screen' : 'h-auto',
          options: [
            { label: 'Auto', value: 'h-auto' },
            { label: 'Full Viewport', value: 'min-h-screen' }
          ]
        },
        {
          key: 'bgMode',
          name: 'Background Mode',
          type: 'select',
          value: (function() {
            const bgCont = el.querySelector(':scope > .background-container');
            if (!bgCont) return 'none';
            if (bgCont.querySelector('video')) return 'video';
            if (bgCont.querySelector('iframe')) return 'youtube';
            if (bgCont.querySelector('img')) return 'image';
            return 'none';
          })(),
          options: [
            { label: 'None', value: 'none' },
            { label: 'Image', value: 'image' },
            { label: 'Video (HTML5)', value: 'video' },
            { label: 'YouTube Video', value: 'youtube' }
          ],
          onChange: function(node, val) {
            let bgContainer = node.querySelector(':scope > .background-container');
            if (val === 'none') {
              if (bgContainer) bgContainer.remove();
            } else {
              if (!bgContainer) {
                bgContainer = node.ownerDocument.createElement('div');
                bgContainer.className = 'background-container absolute inset-0 -z-10 overflow-hidden pointer-events-none';
                node.classList.add('relative');
                node.insertBefore(bgContainer, node.firstChild);
              }
              bgContainer.innerHTML = '';
              if (val === 'image') {
                const img = node.ownerDocument.createElement('img');
                img.src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&q=80';
                img.className = 'w-full h-full object-cover';
                bgContainer.appendChild(img);
              } else if (val === 'video') {
                const vid = node.ownerDocument.createElement('video');
                vid.autoplay = true; vid.loop = true; vid.muted = true; vid.playsInline = true;
                vid.className = 'w-full h-full object-cover';
                vid.src = 'https://www.w3schools.com/html/mov_bbb.mp4';
                bgContainer.appendChild(vid);
              } else if (val === 'youtube') {
                const iframe = node.ownerDocument.createElement('iframe');
                iframe.className = 'w-full h-full pointer-events-none';
                iframe.src = 'https://www.youtube.com/embed/C6fOoy7Se_4?autoplay=1&mute=1&controls=0&loop=1';
                iframe.setAttribute('frameborder', '0');
                bgContainer.appendChild(iframe);
              }
            }
          }
        },
        {
          key: 'overlay',
          name: 'Dark Overlay',
          type: 'toggle',
          value: !!el.querySelector(':scope > .section-overlay'),
          onChange: function(node, val) {
            let overlay = node.querySelector(':scope > .section-overlay');
            if (val) {
              if (!overlay) {
                overlay = node.ownerDocument.createElement('div');
                overlay.className = 'section-overlay absolute inset-0 -z-5 pointer-events-none';
                overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
                node.classList.add('relative');
                node.insertBefore(overlay, node.firstChild);
              }
            } else {
              if (overlay) overlay.remove();
            }
          }
        }
      ];
    }
  });

  // 8. Grid Row & Flex Container
  Registry.register({
    id: 'gridrow',
    name: 'Grid Row / Columns',
    category: 'Layout & Containers',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('row') || cls.includes('grid-row') || el.hasAttribute('data-grid-row') || (cls.includes('flex') && el.querySelector(':scope > [class*=col-]'));
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const cols = [];
      el.querySelectorAll(':scope > .col, :scope > [class*=col-]').forEach(function(col, i) {
        const cCls = col.className;
        const xsM = cCls.match(/\bcol-(\d+)\b/);
        const mdM = cCls.match(/\bcol-md-(\d+)\b/);
        cols.push({
          index: i,
          name: 'Column ' + (i + 1),
          xs: xsM ? xsM[1] : (cCls.includes('col') ? '12' : 'none'),
          md: mdM ? mdM[1] : 'none'
        });
      });
      return [
        {
          key: 'direction',
          name: 'Direction',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse'],
          value: cls.includes('flex-col') ? 'flex-col' : 'flex-row',
          options: [
            { label: 'Row (→)', value: 'flex-row' },
            { label: 'Column (↓)', value: 'flex-col' }
          ]
        },
        {
          key: 'columns',
          name: 'Columns Manager',
          type: 'columnsManager',
          value: cols
        }
      ];
    }
  });

  // ==========================================
  // CATEGORY 4: FORM CONTROLS & INPUTS
  // ==========================================

  // 9. Input Field
  Registry.register({
    id: 'input',
    name: 'Text Input',
    category: 'Form Controls & Inputs',
    match: function(el) {
      const tag = getTag(el);
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      return tag === 'input' && !['checkbox', 'radio', 'range', 'file'].includes(type);
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'placeholder',
          name: 'Placeholder',
          type: 'text',
          htmlAttr: 'placeholder',
          value: el.getAttribute('placeholder') || ''
        },
        {
          key: 'type',
          name: 'Input Type',
          type: 'select',
          htmlAttr: 'type',
          value: el.getAttribute('type') || 'text',
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Email', value: 'email' },
            { label: 'Password', value: 'password' },
            { label: 'Number', value: 'number' },
            { label: 'Tel', value: 'tel' },
            { label: 'URL', value: 'url' },
            { label: 'Search', value: 'search' }
          ]
        },
        {
          key: 'variant',
          name: 'Border Variant',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['input-bordered', 'input-ghost', 'input-primary', 'input-secondary', 'input-accent', 'input-info', 'input-success', 'input-warning', 'input-error'],
          value: ['input-primary', 'input-secondary', 'input-accent', 'input-info', 'input-success', 'input-warning', 'input-error', 'input-ghost'].find(v => cls.includes(v)) || 'input-bordered',
          options: [
            { label: 'Bordered', value: 'input-bordered' },
            { label: 'Primary', value: 'input-primary' },
            { label: 'Secondary', value: 'input-secondary' },
            { label: 'Accent', value: 'input-accent' },
            { label: 'Ghost', value: 'input-ghost' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['input-xs', 'input-sm', 'input-md', 'input-lg'],
          value: ['input-xs', 'input-sm', 'input-md', 'input-lg'].find(s => cls.includes(s)) || 'input-md',
          options: [
            { label: 'XS', value: 'input-xs' },
            { label: 'SM', value: 'input-sm' },
            { label: 'MD', value: 'input-md' },
            { label: 'LG', value: 'input-lg' }
          ]
        },
        {
          key: 'required',
          name: 'Required',
          type: 'toggle',
          value: el.hasAttribute('required'),
          htmlAttr: 'required'
        },
        {
          key: 'disabled',
          name: 'Disabled',
          type: 'toggle',
          value: el.hasAttribute('disabled'),
          htmlAttr: 'disabled'
        }
      ];
    }
  });

  // 10. Textarea
  Registry.register({
    id: 'textarea',
    name: 'Textarea',
    category: 'Form Controls & Inputs',
    match: function(el) {
      return getTag(el) === 'textarea';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'placeholder',
          name: 'Placeholder',
          type: 'text',
          htmlAttr: 'placeholder',
          value: el.getAttribute('placeholder') || ''
        },
        {
          key: 'rows',
          name: 'Rows Count',
          type: 'number',
          htmlAttr: 'rows',
          value: el.getAttribute('rows') || '3'
        },
        {
          key: 'variant',
          name: 'Color Variant',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['textarea-bordered', 'textarea-primary', 'textarea-secondary', 'textarea-accent'],
          value: ['textarea-primary', 'textarea-secondary', 'textarea-accent'].find(v => cls.includes(v)) || 'textarea-bordered',
          options: [
            { label: 'Bordered', value: 'textarea-bordered' },
            { label: 'Primary', value: 'textarea-primary' },
            { label: 'Secondary', value: 'textarea-secondary' }
          ]
        }
      ];
    }
  });

  // 11. Select Dropdown
  Registry.register({
    id: 'select',
    name: 'Select Dropdown',
    category: 'Form Controls & Inputs',
    match: function(el) {
      return getTag(el) === 'select';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const opts = Array.from(el.querySelectorAll('option')).map(o => ({ text: o.textContent.trim(), value: o.value }));
      return [
        {
          key: 'variant',
          name: 'Color Variant',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['select-bordered', 'select-primary', 'select-secondary', 'select-accent'],
          value: ['select-primary', 'select-secondary', 'select-accent'].find(v => cls.includes(v)) || 'select-bordered',
          options: [
            { label: 'Bordered', value: 'select-bordered' },
            { label: 'Primary', value: 'select-primary' },
            { label: 'Secondary', value: 'select-secondary' }
          ]
        },
        {
          key: 'optionsManager',
          name: 'Options Manager',
          type: 'optionsManager',
          value: opts,
          onChange: function(node, newOpts) {
            node.innerHTML = '';
            newOpts.forEach(function(o) {
              const opt = node.ownerDocument.createElement('option');
              opt.value = o.value;
              opt.textContent = o.text;
              node.appendChild(opt);
            });
          }
        }
      ];
    }
  });

  // 12. Checkbox & Toggle Switch
  Registry.register({
    id: 'checkbox-toggle',
    name: 'Checkbox / Toggle',
    category: 'Form Controls & Inputs',
    match: function(el) {
      const tag = getTag(el);
      const type = (el.getAttribute('type') || '').toLowerCase();
      const cls = safeClasses(el);
      return (tag === 'input' && type === 'checkbox') || cls.includes('checkbox') || cls.includes('toggle');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const isToggle = cls.includes('toggle');
      return [
        {
          key: 'styleType',
          name: 'Input Style',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['checkbox', 'toggle'],
          value: isToggle ? 'toggle' : 'checkbox',
          options: [
            { label: 'Checkbox', value: 'checkbox' },
            { label: 'Toggle Switch', value: 'toggle' }
          ]
        },
        {
          key: 'variant',
          name: 'Color Variant',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['checkbox-primary', 'checkbox-secondary', 'checkbox-accent', 'checkbox-success', 'toggle-primary', 'toggle-secondary', 'toggle-accent', 'toggle-success'],
          value: isToggle
            ? (['toggle-primary', 'toggle-secondary', 'toggle-accent', 'toggle-success'].find(v => cls.includes(v)) || 'toggle-primary')
            : (['checkbox-primary', 'checkbox-secondary', 'checkbox-accent', 'checkbox-success'].find(v => cls.includes(v)) || 'checkbox-primary'),
          options: [
            { label: 'Primary', value: isToggle ? 'toggle-primary' : 'checkbox-primary' },
            { label: 'Secondary', value: isToggle ? 'toggle-secondary' : 'checkbox-secondary' },
            { label: 'Accent', value: isToggle ? 'toggle-accent' : 'checkbox-accent' },
            { label: 'Success', value: isToggle ? 'toggle-success' : 'checkbox-success' }
          ]
        },
        {
          key: 'checked',
          name: 'Checked / Active',
          type: 'toggle',
          value: el.checked || el.hasAttribute('checked'),
          onChange: function(node, val) {
            node.checked = val;
            if (val) node.setAttribute('checked', '');
            else node.removeAttribute('checked');
          }
        }
      ];
    }
  });

  // 13. Range Slider
  Registry.register({
    id: 'range',
    name: 'Range Slider',
    category: 'Form Controls & Inputs',
    match: function(el) {
      return getTag(el) === 'input' && (el.getAttribute('type') === 'range' || safeClasses(el).includes('range'));
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'min',
          name: 'Min Value',
          type: 'number',
          htmlAttr: 'min',
          value: el.getAttribute('min') || '0'
        },
        {
          key: 'max',
          name: 'Max Value',
          type: 'number',
          htmlAttr: 'max',
          value: el.getAttribute('max') || '100'
        },
        {
          key: 'step',
          name: 'Step',
          type: 'number',
          htmlAttr: 'step',
          value: el.getAttribute('step') || '1'
        },
        {
          key: 'variant',
          name: 'Color Variant',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['range-primary', 'range-secondary', 'range-accent', 'range-success', 'range-warning', 'range-error'],
          value: ['range-primary', 'range-secondary', 'range-accent', 'range-success', 'range-warning', 'range-error'].find(v => cls.includes(v)) || 'range-primary',
          options: [
            { label: 'Primary', value: 'range-primary' },
            { label: 'Secondary', value: 'range-secondary' },
            { label: 'Accent', value: 'range-accent' }
          ]
        }
      ];
    }
  });

  // ==========================================
  // CATEGORY 5: CARDS & MEDIA
  // ==========================================

  // 14. Card
  Registry.register({
    id: 'card',
    name: 'Card Container',
    category: 'Cards & Media',
    match: function(el) {
      return safeClasses(el).includes('card');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'bordered',
          name: 'Bordered',
          type: 'toggle',
          value: cls.includes('card-bordered') || cls.includes('border'),
          onChange: function(node, val) { node.classList.toggle('card-bordered', val); }
        },
        {
          key: 'compact',
          name: 'Compact Spacing',
          type: 'toggle',
          value: cls.includes('card-compact'),
          onChange: function(node, val) { node.classList.toggle('card-compact', val); }
        },
        {
          key: 'side',
          name: 'Side Image Layout',
          type: 'toggle',
          value: cls.includes('card-side'),
          onChange: function(node, val) { node.classList.toggle('card-side', val); }
        },
        {
          key: 'imageFull',
          name: 'Image Full Overlay',
          type: 'toggle',
          value: cls.includes('image-full'),
          onChange: function(node, val) { node.classList.toggle('image-full', val); }
        }
      ];
    }
  });

  // 15. Image
  Registry.register({
    id: 'image',
    name: 'Image',
    category: 'Cards & Media',
    match: function(el) {
      return getTag(el) === 'img' || (getTag(el) === 'figure' && el.querySelector('img'));
    },
    getProperties: function(el) {
      const img = getTag(el) === 'img' ? el : el.querySelector('img');
      const cls = safeClasses(img || el);
      return [
        {
          key: 'src',
          name: 'Image Source (URL)',
          type: 'text',
          value: (img ? img.getAttribute('src') : '') || '',
          onChange: function(node, val) {
            const targetImg = getTag(node) === 'img' ? node : node.querySelector('img');
            if (targetImg) targetImg.src = val;
          }
        },
        {
          key: 'alt',
          name: 'Alt Description',
          type: 'text',
          value: (img ? img.getAttribute('alt') : '') || '',
          onChange: function(node, val) {
            const targetImg = getTag(node) === 'img' ? node : node.querySelector('img');
            if (targetImg) targetImg.alt = val;
          }
        },
        {
          key: 'rounded',
          name: 'Corner Radius',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['rounded-none', 'rounded-lg', 'rounded-2xl', 'rounded-box', 'rounded-full'],
          value: ['rounded-full', 'rounded-box', 'rounded-2xl', 'rounded-lg'].find(r => cls.includes(r)) || 'rounded-none',
          options: [
            { label: 'None', value: 'rounded-none' },
            { label: 'Subtle (LG)', value: 'rounded-lg' },
            { label: 'Curved (2XL)', value: 'rounded-2xl' },
            { label: 'DaisyUI Box', value: 'rounded-box' },
            { label: 'Circle (Full)', value: 'rounded-full' }
          ]
        }
      ];
    }
  });

  // 16. SVG Icon
  Registry.register({
    id: 'svg-icon',
    name: 'SVG Vector / Icon',
    category: 'Cards & Media',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'svg' || cls.includes('svg-image') || tag === 'iconify-icon';
    },
    getProperties: function(el) {
      return [
        {
          key: 'iconPicker',
          name: 'Icon Palette',
          type: 'iconPicker',
          value: 'star'
        },
        {
          key: 'width',
          name: 'Width (px)',
          type: 'number',
          htmlAttr: 'width',
          value: el.getAttribute('width') || '24'
        },
        {
          key: 'height',
          name: 'Height (px)',
          type: 'number',
          htmlAttr: 'height',
          value: el.getAttribute('height') || '24'
        }
      ];
    }
  });

  // ==========================================
  // CATEGORY 6: NAVIGATION, MENUS & TABS
  // ==========================================

  // 17. Navbar
  Registry.register({
    id: 'navbar',
    name: 'Navbar',
    category: 'Navigation & Menus',
    match: function(el) {
      return safeClasses(el).includes('navbar') || getTag(el) === 'nav';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'bgVariant',
          name: 'Background Tone',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'bg-neutral', 'bg-primary'],
          value: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'bg-neutral', 'bg-primary'].find(b => cls.includes(b)) || 'bg-base-100',
          options: [
            { label: 'Base 100', value: 'bg-base-100' },
            { label: 'Base 200', value: 'bg-base-200' },
            { label: 'Base 300', value: 'bg-base-300' },
            { label: 'Neutral Dark', value: 'bg-neutral text-neutral-content' },
            { label: 'Primary Brand', value: 'bg-primary text-primary-content' }
          ]
        },
        {
          key: 'shadow',
          name: 'Shadow',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['shadow-none', 'shadow-xs', 'shadow-sm', 'shadow-md', 'shadow-lg'],
          value: ['shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xs'].find(s => cls.includes(s)) || 'shadow-sm',
          options: [
            { label: 'None', value: 'shadow-none' },
            { label: 'Subtle (SM)', value: 'shadow-sm' },
            { label: 'Medium (MD)', value: 'shadow-md' },
            { label: 'Prominent (LG)', value: 'shadow-lg' }
          ]
        }
      ];
    }
  });

  // 18. Tabs
  Registry.register({
    id: 'tabs',
    name: 'Tabs',
    category: 'Navigation & Menus',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('tabs') || el.getAttribute('role') === 'tablist';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'style',
          name: 'Tab Style',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['tabs-bordered', 'tabs-lifted', 'tabs-box'],
          value: cls.includes('tabs-lifted') ? 'tabs-lifted' : (cls.includes('tabs-box') ? 'tabs-box' : 'tabs-bordered'),
          options: [
            { label: 'Bordered Bottom', value: 'tabs-bordered' },
            { label: 'Lifted Tabs', value: 'tabs-lifted' },
            { label: 'Segmented Box', value: 'tabs-box' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['tabs-xs', 'tabs-sm', 'tabs-md', 'tabs-lg'],
          value: ['tabs-xs', 'tabs-sm', 'tabs-md', 'tabs-lg'].find(s => cls.includes(s)) || 'tabs-md',
          options: [
            { label: 'XS', value: 'tabs-xs' },
            { label: 'SM', value: 'tabs-sm' },
            { label: 'MD', value: 'tabs-md' },
            { label: 'LG', value: 'tabs-lg' }
          ]
        }
      ];
    }
  });

  // 19. Collapse / Accordion
  Registry.register({
    id: 'collapse',
    name: 'Collapse / Accordion',
    category: 'Navigation & Menus',
    match: function(el) {
      return safeClasses(el).includes('collapse') || getTag(el) === 'details';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'icon',
          name: 'Indicator Icon',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['collapse-arrow', 'collapse-plus'],
          value: cls.includes('collapse-plus') ? 'collapse-plus' : 'collapse-arrow',
          options: [
            { label: 'Arrow (Chevron)', value: 'collapse-arrow' },
            { label: 'Plus (+ / -)', value: 'collapse-plus' }
          ]
        },
        {
          key: 'open',
          name: 'Open by Default',
          type: 'toggle',
          value: cls.includes('collapse-open') || el.hasAttribute('open'),
          onChange: function(node, val) {
            node.classList.toggle('collapse-open', val);
            if (node.tagName.toLowerCase() === 'details') {
              if (val) node.setAttribute('open', '');
              else node.removeAttribute('open');
            }
          }
        }
      ];
    }
  });

  // ==========================================
  // CATEGORY 7: FEEDBACK, OVERLAYS & INDICATORS
  // ==========================================

  // 20. Alert Banner
  Registry.register({
    id: 'alert',
    name: 'Alert Banner',
    category: 'Feedback & Overlays',
    match: function(el) {
      return safeClasses(el).includes('alert');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'variant',
          name: 'Alert Type',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['alert-info', 'alert-success', 'alert-warning', 'alert-error'],
          value: ['alert-info', 'alert-success', 'alert-warning', 'alert-error'].find(v => cls.includes(v)) || 'alert-info',
          options: [
            { label: 'Info (Blue)', value: 'alert-info' },
            { label: 'Success (Green)', value: 'alert-success' },
            { label: 'Warning (Amber)', value: 'alert-warning' },
            { label: 'Error (Red)', value: 'alert-error' }
          ]
        },
        {
          key: 'style',
          name: 'Style Modifier',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['alert-soft', 'alert-dash', 'alert-outline'],
          value: ['alert-soft', 'alert-dash', 'alert-outline'].find(s => cls.includes(s)) || 'none',
          options: [
            { label: 'Solid', value: 'none' },
            { label: 'Soft Tone', value: 'alert-soft' },
            { label: 'Dashed Border', value: 'alert-dash' },
            { label: 'Outline', value: 'alert-outline' }
          ]
        }
      ];
    }
  });

  // 21. Progress Bar
  Registry.register({
    id: 'progress',
    name: 'Progress Bar',
    category: 'Feedback & Overlays',
    match: function(el) {
      return safeClasses(el).includes('progress') || getTag(el) === 'progress';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'value',
          name: 'Current Value (%)',
          type: 'number',
          htmlAttr: 'value',
          value: el.getAttribute('value') || '50'
        },
        {
          key: 'max',
          name: 'Max Value',
          type: 'number',
          htmlAttr: 'max',
          value: el.getAttribute('max') || '100'
        },
        {
          key: 'variant',
          name: 'Color Variant',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['progress-primary', 'progress-secondary', 'progress-accent', 'progress-success', 'progress-warning', 'progress-error'],
          value: ['progress-primary', 'progress-secondary', 'progress-accent', 'progress-success', 'progress-warning', 'progress-error'].find(v => cls.includes(v)) || 'progress-primary',
          options: [
            { label: 'Primary', value: 'progress-primary' },
            { label: 'Secondary', value: 'progress-secondary' },
            { label: 'Accent', value: 'progress-accent' },
            { label: 'Success', value: 'progress-success' }
          ]
        }
      ];
    }
  });

  // 22. Loading Spinner
  Registry.register({
    id: 'loading',
    name: 'Loading Indicator',
    category: 'Feedback & Overlays',
    match: function(el) {
      return safeClasses(el).includes('loading');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'type',
          name: 'Spinner Style',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['loading-spinner', 'loading-dots', 'loading-ring', 'loading-ball', 'loading-bars', 'loading-infinity'],
          value: ['loading-spinner', 'loading-dots', 'loading-ring', 'loading-ball', 'loading-bars', 'loading-infinity'].find(t => cls.includes(t)) || 'loading-spinner',
          options: [
            { label: 'Spinner', value: 'loading-spinner' },
            { label: 'Dots', value: 'loading-dots' },
            { label: 'Ring', value: 'loading-ring' },
            { label: 'Bars', value: 'loading-bars' },
            { label: 'Infinity', value: 'loading-infinity' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['loading-xs', 'loading-sm', 'loading-md', 'loading-lg'],
          value: ['loading-xs', 'loading-sm', 'loading-md', 'loading-lg'].find(s => cls.includes(s)) || 'loading-md',
          options: [
            { label: 'XS', value: 'loading-xs' },
            { label: 'SM', value: 'loading-sm' },
            { label: 'MD', value: 'loading-md' },
            { label: 'LG', value: 'loading-lg' }
          ]
        }
      ];
    }
  });

  // 23. Stats Counter
  Registry.register({
    id: 'stats',
    name: 'Stats Grid',
    category: 'Feedback & Overlays',
    match: function(el) {
      return safeClasses(el).includes('stats') || safeClasses(el).includes('stat');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'orientation',
          name: 'Orientation',
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
          name: 'Shadow Depth',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg'],
          value: ['shadow-sm', 'shadow', 'shadow-md', 'shadow-lg'].find(s => cls.includes(s)) || 'shadow',
          options: [
            { label: 'None', value: 'shadow-none' },
            { label: 'Subtle', value: 'shadow-sm' },
            { label: 'Standard', value: 'shadow' },
            { label: 'Elevated', value: 'shadow-md' }
          ]
        }
      ];
    }
  });

  // Expose to window
  window.NexusBuilderComponents = Registry;

})();
