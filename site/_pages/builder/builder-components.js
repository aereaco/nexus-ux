// Nexus Builder Component Registry & Dynamic Property Schema Engine
// Aligned with VvvebJs dynamic component property architecture & DaisyUI 5 / Tailwind CSS
(function() {
  'use strict';

  function safeClasses(el) {
    return el && el.className && typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean) : [];
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
      return (tag === 'button' || (tag === 'a' && cls.includes('btn')) || cls.includes('btn')) && !cls.includes('btn-group') && !cls.includes('btn-circle');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const tag = getTag(el);
      const props = [
        {
          key: 'text',
          name: 'Text Content',
          type: 'text',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'variant',
          name: 'Button Variant',
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
            { label: 'LG', value: 'btn-lg' }
          ]
        },
        {
          key: 'style',
          name: 'Visual Style',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['btn-outline', 'btn-soft', 'btn-dash'],
          value: ['btn-outline', 'btn-soft', 'btn-dash'].find(s => cls.includes(s)) || 'none',
          options: [
            { label: 'Solid', value: 'none' },
            { label: 'Outline', value: 'btn-outline' },
            { label: 'Soft', value: 'btn-soft' },
            { label: 'Dashed', value: 'btn-dash' }
          ]
        },
        {
          key: 'shape',
          name: 'Shape',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['btn-square', 'btn-circle', 'btn-wide', 'btn-block'],
          value: ['btn-square', 'btn-circle', 'btn-wide', 'btn-block'].find(s => cls.includes(s)) || 'none',
          options: [
            { label: 'Default', value: 'none' },
            { label: 'Wide', value: 'btn-wide' },
            { label: 'Block', value: 'btn-block' },
            { label: 'Square', value: 'btn-square' }
          ]
        }
      ];
      if (tag === 'a') {
        props.push({
          key: 'href',
          name: 'Link URL',
          type: 'text',
          htmlAttr: 'href',
          value: el.getAttribute('href') || '#'
        });
      }
      return props;
    }
  });

  // 2. Button Group / Join
  Registry.register({
    id: 'btn-group',
    name: 'Button Group',
    category: 'Buttons & Actions',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('join') || cls.includes('btn-group');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'orientation',
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

  // 3. Close Button / Dismiss
  Registry.register({
    id: 'btn-close',
    name: 'Close Button',
    category: 'Buttons & Actions',
    match: function(el) {
      const cls = safeClasses(el);
      return (cls.includes('btn-circle') && cls.includes('btn-ghost')) || cls.includes('btn-close');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'size',
          name: 'Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['btn-xs', 'btn-sm', 'btn-md'],
          value: ['btn-xs', 'btn-sm', 'btn-md'].find(s => cls.includes(s)) || 'btn-xs',
          options: [
            { label: 'XS', value: 'btn-xs' },
            { label: 'SM', value: 'btn-sm' },
            { label: 'MD', value: 'btn-md' }
          ]
        }
      ];
    }
  });

  // 4. Floating Action Button (FAB)
  Registry.register({
    id: 'btn-fab',
    name: 'Floating Action Button',
    category: 'Buttons & Actions',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('btn-circle') && (cls.includes('fixed') || cls.includes('absolute'));
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'variant',
          name: 'Variant',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['btn-primary', 'btn-secondary', 'btn-accent', 'btn-neutral'],
          value: ['btn-primary', 'btn-secondary', 'btn-accent', 'btn-neutral'].find(v => cls.includes(v)) || 'btn-primary',
          options: [
            { label: 'Primary', value: 'btn-primary' },
            { label: 'Secondary', value: 'btn-secondary' },
            { label: 'Accent', value: 'btn-accent' },
            { label: 'Neutral', value: 'btn-neutral' }
          ]
        },
        {
          key: 'position',
          name: 'Position',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['bottom-4 right-4', 'bottom-6 right-6', 'bottom-8 right-8', 'bottom-4 left-4'],
          value: cls.includes('bottom-6') ? 'bottom-6 right-6' : 'bottom-4 right-4',
          options: [
            { label: 'Bottom Right', value: 'bottom-6 right-6' },
            { label: 'Bottom Left', value: 'bottom-4 left-4' }
          ]
        }
      ];
    }
  });

  // ==========================================
  // CATEGORY 2: TYPOGRAPHY & STRUCTURE
  // ==========================================

  // 5. Heading (H1-H6)
  Registry.register({
    id: 'heading',
    name: 'Heading',
    category: 'Typography & Structure',
    match: function(el) {
      const tag = getTag(el);
      return ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag);
    },
    getProperties: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return [
        {
          key: 'text',
          name: 'Heading Text',
          type: 'textarea',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'level',
          name: 'Level (Tag)',
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
          type: 'select',
          htmlAttr: 'class',
          validValues: ['text-primary', 'text-secondary', 'text-accent', 'text-base-content', 'text-neutral'],
          value: ['text-primary', 'text-secondary', 'text-accent', 'text-neutral'].find(c => cls.includes(c)) || 'text-base-content',
          options: [
            { label: 'Default', value: 'text-base-content' },
            { label: 'Primary', value: 'text-primary' },
            { label: 'Secondary', value: 'text-secondary' },
            { label: 'Accent', value: 'text-accent' },
            { label: 'Neutral', value: 'text-neutral' }
          ]
        }
      ];
    }
  });

  // 6. Paragraph
  Registry.register({
    id: 'paragraph',
    name: 'Paragraph',
    category: 'Typography & Structure',
    match: function(el) {
      return getTag(el) === 'p';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'text',
          name: 'Paragraph Text',
          type: 'textarea',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'size',
          name: 'Text Size',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'],
          value: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'].find(s => cls.includes(s)) || 'text-base',
          options: [
            { label: 'Extra Small', value: 'text-xs' },
            { label: 'Small', value: 'text-sm' },
            { label: 'Base', value: 'text-base' },
            { label: 'Large (Lead)', value: 'text-lg' },
            { label: 'Extra Large', value: 'text-xl' }
          ]
        },
        {
          key: 'align',
          name: 'Alignment',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['text-left', 'text-center', 'text-right', 'text-justify'],
          value: ['text-left', 'text-center', 'text-right', 'text-justify'].find(a => cls.includes(a)) || 'text-left',
          options: [
            { label: 'Left', value: 'text-left' },
            { label: 'Center', value: 'text-center' },
            { label: 'Right', value: 'text-right' },
            { label: 'Justify', value: 'text-justify' }
          ]
        }
      ];
    }
  });

  // 7. Blockquote
  Registry.register({
    id: 'blockquote',
    name: 'Blockquote',
    category: 'Typography & Structure',
    match: function(el) {
      return getTag(el) === 'blockquote';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'quote',
          name: 'Quote Text',
          type: 'textarea',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'border',
          name: 'Border Accent',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['border-primary', 'border-secondary', 'border-accent', 'border-base-content/20'],
          value: ['border-primary', 'border-secondary', 'border-accent'].find(b => cls.includes(b)) || 'border-primary',
          options: [
            { label: 'Primary', value: 'border-primary' },
            { label: 'Secondary', value: 'border-secondary' },
            { label: 'Accent', value: 'border-accent' },
            { label: 'Muted', value: 'border-base-content/20' }
          ]
        }
      ];
    }
  });

  // 8. List (UL / OL)
  Registry.register({
    id: 'list',
    name: 'List',
    category: 'Typography & Structure',
    match: function(el) {
      const tag = getTag(el);
      return tag === 'ul' || tag === 'ol';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'style',
          name: 'List Style',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['list-disc', 'list-decimal', 'list-none'],
          value: ['list-disc', 'list-decimal', 'list-none'].find(s => cls.includes(s)) || 'list-disc',
          options: [
            { label: 'Bullets (Disc)', value: 'list-disc' },
            { label: 'Numbers (Decimal)', value: 'list-decimal' },
            { label: 'None (Plain)', value: 'list-none' }
          ]
        },
        {
          key: 'spacing',
          name: 'Item Spacing',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['space-y-1', 'space-y-2', 'space-y-4'],
          value: ['space-y-1', 'space-y-2', 'space-y-4'].find(s => cls.includes(s)) || 'space-y-2',
          options: [
            { label: 'Tight', value: 'space-y-1' },
            { label: 'Normal', value: 'space-y-2' },
            { label: 'Relaxed', value: 'space-y-4' }
          ]
        }
      ];
    }
  });

  // 9. List Item
  Registry.register({
    id: 'list-item',
    name: 'List Item',
    category: 'Typography & Structure',
    match: function(el) {
      return getTag(el) === 'li';
    },
    getProperties: function(el) {
      return [
        {
          key: 'text',
          name: 'Item Text',
          type: 'text',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        }
      ];
    }
  });

  // 10. List Group / Menu
  Registry.register({
    id: 'menu',
    name: 'Menu / List Group',
    category: 'Typography & Structure',
    match: function(el) {
      return safeClasses(el).includes('menu');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'size',
          name: 'Menu Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['menu-xs', 'menu-sm', 'menu-md', 'menu-lg'],
          value: ['menu-xs', 'menu-sm', 'menu-md', 'menu-lg'].find(s => cls.includes(s)) || 'menu-md',
          options: [
            { label: 'XS', value: 'menu-xs' },
            { label: 'SM', value: 'menu-sm' },
            { label: 'MD', value: 'menu-md' },
            { label: 'LG', value: 'menu-lg' }
          ]
        },
        {
          key: 'rounded',
          name: 'Box Rounded',
          type: 'toggle',
          value: cls.includes('rounded-box'),
          onChange: function(node, val) {
            if (val) node.classList.add('rounded-box');
            else node.classList.remove('rounded-box');
          }
        }
      ];
    }
  });

  // 11. Code / Preformatted / Mockup Code
  Registry.register({
    id: 'code',
    name: 'Code Mockup',
    category: 'Typography & Structure',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'pre' || tag === 'code' || cls.includes('mockup-code');
    },
    getProperties: function(el) {
      return [
        {
          key: 'code',
          name: 'Code Snippet',
          type: 'textarea',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        }
      ];
    }
  });

  // 12. Divider
  Registry.register({
    id: 'divider',
    name: 'Divider',
    category: 'Typography & Structure',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'hr' || cls.includes('divider');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'text',
          name: 'Divider Text',
          type: 'text',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'orientation',
          name: 'Orientation',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['divider-horizontal'],
          value: cls.includes('divider-horizontal') ? 'divider-horizontal' : 'none',
          options: [
            { label: 'Horizontal', value: 'none' },
            { label: 'Vertical', value: 'divider-horizontal' }
          ]
        },
        {
          key: 'color',
          name: 'Color Accent',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['divider-primary', 'divider-secondary', 'divider-accent', 'divider-neutral', 'divider-success', 'divider-error'],
          value: ['divider-primary', 'divider-secondary', 'divider-accent', 'divider-neutral'].find(c => cls.includes(c)) || 'none',
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

  // 13. Badge
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
            { label: 'Error', value: 'badge-error' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
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
        }
      ];
    }
  });

  // 14. Keyboard (Kbd)
  Registry.register({
    id: 'kbd',
    name: 'Keyboard Key (Kbd)',
    category: 'Typography & Structure',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'kbd' || cls.includes('kbd');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'text',
          name: 'Key Character',
          type: 'text',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'size',
          name: 'Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['kbd-xs', 'kbd-sm', 'kbd-md', 'kbd-lg'],
          value: ['kbd-xs', 'kbd-sm', 'kbd-md', 'kbd-lg'].find(s => cls.includes(s)) || 'kbd-sm',
          options: [
            { label: 'XS', value: 'kbd-xs' },
            { label: 'SM', value: 'kbd-sm' },
            { label: 'MD', value: 'kbd-md' },
            { label: 'LG', value: 'kbd-lg' }
          ]
        }
      ];
    }
  });

  // 15. Form Label
  Registry.register({
    id: 'label',
    name: 'Form Label',
    category: 'Typography & Structure',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'label' || cls.includes('label');
    },
    getProperties: function(el) {
      return [
        {
          key: 'text',
          name: 'Label Text',
          type: 'text',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        }
      ];
    }
  });

  // ==========================================
  // CATEGORY 3: LAYOUT & CONTAINERS
  // ==========================================

  // 16. Section / Hero
  Registry.register({
    id: 'section',
    name: 'Section Shell',
    category: 'Layout & Containers',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'section' || cls.includes('hero') || (tag === 'header' && cls.includes('section'));
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'paddingY',
          name: 'Vertical Padding',
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
        {
          key: 'bgTone',
          name: 'Background Tone',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'bg-neutral', 'bg-primary/5'],
          value: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'bg-neutral', 'bg-primary/5'].find(b => cls.includes(b)) || 'bg-base-100',
          options: [
            { label: 'Base 100 (Default)', value: 'bg-base-100' },
            { label: 'Base 200 (Subtle)', value: 'bg-base-200' },
            { label: 'Base 300 (Inset)', value: 'bg-base-300' },
            { label: 'Neutral (Dark Contrast)', value: 'bg-neutral' },
            { label: 'Primary Glow (5%)', value: 'bg-primary/5' }
          ]
        },
        {
          key: 'maxWidth',
          name: 'Max Width Constraint',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['max-w-5xl', 'max-w-6xl', 'max-w-7xl', 'max-w-full'],
          value: ['max-w-5xl', 'max-w-6xl', 'max-w-7xl', 'max-w-full'].find(w => cls.includes(w)) || 'max-w-7xl',
          options: [
            { label: 'Standard (7xl / 1280px)', value: 'max-w-7xl' },
            { label: 'Medium (6xl / 1152px)', value: 'max-w-6xl' },
            { label: 'Compact (5xl / 1024px)', value: 'max-w-5xl' },
            { label: 'Full Bleed', value: 'max-w-full' }
          ]
        }
      ];
    }
  });

  // 17. Container
  Registry.register({
    id: 'container',
    name: 'Container Box',
    category: 'Layout & Containers',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('container') || cls.some(c => c.startsWith('max-w-'));
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'maxWidth',
          name: 'Max Width',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-3xl', 'max-w-5xl', 'max-w-7xl', 'max-w-full'],
          value: ['max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-3xl', 'max-w-5xl', 'max-w-7xl', 'max-w-full'].find(w => cls.includes(w)) || 'max-w-7xl',
          options: [
            { label: 'Medium (3xl)', value: 'max-w-3xl' },
            { label: 'Large (5xl)', value: 'max-w-5xl' },
            { label: 'Wide (7xl)', value: 'max-w-7xl' },
            { label: 'Full Bleed', value: 'max-w-full' }
          ]
        }
      ];
    }
  });

  // 18. Grid Row / Grid Container
  Registry.register({
    id: 'gridrow',
    name: 'Grid Layout',
    category: 'Layout & Containers',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('grid') || cls.some(c => c.startsWith('grid-cols-'));
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'cols',
          name: 'Desktop Columns',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4'],
          value: ['md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4'].find(c => cls.includes(c)) || 'md:grid-cols-3',
          options: [
            { label: '1 Col', value: 'md:grid-cols-1' },
            { label: '2 Cols', value: 'md:grid-cols-2' },
            { label: '3 Cols', value: 'md:grid-cols-3' },
            { label: '4 Cols', value: 'md:grid-cols-4' }
          ]
        },
        {
          key: 'gap',
          name: 'Grid Gap',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['gap-2', 'gap-4', 'gap-6', 'gap-8', 'gap-12'],
          value: ['gap-2', 'gap-4', 'gap-6', 'gap-8', 'gap-12'].find(g => cls.includes(g)) || 'gap-6',
          options: [
            { label: 'Tight (8px)', value: 'gap-2' },
            { label: 'Normal (16px)', value: 'gap-4' },
            { label: 'Spacious (24px)', value: 'gap-6' },
            { label: 'Wide (32px)', value: 'gap-8' }
          ]
        }
      ];
    }
  });

  // 19. Grid Column
  Registry.register({
    id: 'gridcolumn',
    name: 'Grid Column',
    category: 'Layout & Containers',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.some(c => c.startsWith('col-span-')) || cls.includes('col') || cls.includes('flex-1');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'span',
          name: 'Column Span',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['col-span-1', 'col-span-2', 'col-span-3', 'col-span-4', 'col-span-6', 'col-span-12', 'col-span-full'],
          value: ['col-span-1', 'col-span-2', 'col-span-3', 'col-span-4', 'col-span-6', 'col-span-12', 'col-span-full'].find(s => cls.includes(s)) || 'col-span-1',
          options: [
            { label: '1 of 12', value: 'col-span-1' },
            { label: '2 of 12', value: 'col-span-2' },
            { label: '3 of 12 (Quarter)', value: 'col-span-3' },
            { label: '4 of 12 (Third)', value: 'col-span-4' },
            { label: '6 of 12 (Half)', value: 'col-span-6' },
            { label: 'Full Width', value: 'col-span-full' }
          ]
        }
      ];
    }
  });

  // 20. Flexbox Container
  Registry.register({
    id: 'flexbox',
    name: 'Flexbox Container',
    category: 'Layout & Containers',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('flex') && !cls.includes('btn') && !cls.includes('join');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'direction',
          name: 'Direction',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['flex-row', 'flex-col'],
          value: cls.includes('flex-col') ? 'flex-col' : 'flex-row',
          options: [
            { label: 'Row', value: 'flex-row' },
            { label: 'Column', value: 'flex-col' }
          ]
        },
        {
          key: 'align',
          name: 'Align Items',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['items-start', 'items-center', 'items-end', 'items-stretch'],
          value: ['items-start', 'items-center', 'items-end', 'items-stretch'].find(a => cls.includes(a)) || 'items-center',
          options: [
            { label: 'Start', value: 'items-start' },
            { label: 'Center', value: 'items-center' },
            { label: 'End', value: 'items-end' },
            { label: 'Stretch', value: 'items-stretch' }
          ]
        },
        {
          key: 'justify',
          name: 'Justify Content',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['justify-start', 'justify-center', 'justify-between', 'justify-end'],
          value: ['justify-start', 'justify-center', 'justify-between', 'justify-end'].find(j => cls.includes(j)) || 'justify-start',
          options: [
            { label: 'Start', value: 'justify-start' },
            { label: 'Center', value: 'justify-center' },
            { label: 'Space Between', value: 'justify-between' },
            { label: 'End', value: 'justify-end' }
          ]
        }
      ];
    }
  });

  // 21. Header / Banner
  Registry.register({
    id: 'header',
    name: 'Header Shell',
    category: 'Layout & Containers',
    match: function(el) {
      return getTag(el) === 'header';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'sticky',
          name: 'Sticky Header',
          type: 'toggle',
          value: cls.includes('sticky'),
          onChange: function(node, val) {
            if (val) node.classList.add('sticky', 'top-0', 'z-50');
            else node.classList.remove('sticky', 'top-0', 'z-50');
          }
        },
        {
          key: 'shadow',
          name: 'Shadow',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['shadow-none', 'shadow-xs', 'shadow-sm', 'shadow-md'],
          value: ['shadow-none', 'shadow-xs', 'shadow-sm', 'shadow-md'].find(s => cls.includes(s)) || 'shadow-sm',
          options: [
            { label: 'None', value: 'shadow-none' },
            { label: 'Subtle', value: 'shadow-xs' },
            { label: 'Small', value: 'shadow-sm' },
            { label: 'Medium', value: 'shadow-md' }
          ]
        }
      ];
    }
  });

  // 22. Footer
  Registry.register({
    id: 'footer',
    name: 'Footer',
    category: 'Layout & Containers',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'footer' || cls.includes('footer');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'layout',
          name: 'Layout Mode',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['footer-center'],
          value: cls.includes('footer-center') ? 'footer-center' : 'none',
          options: [
            { label: 'Columns', value: 'none' },
            { label: 'Centered', value: 'footer-center' }
          ]
        },
        {
          key: 'bgTone',
          name: 'Background Tone',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['bg-base-200', 'bg-base-300', 'bg-neutral text-neutral-content'],
          value: cls.includes('bg-neutral') ? 'bg-neutral text-neutral-content' : 'bg-base-200',
          options: [
            { label: 'Base 200', value: 'bg-base-200' },
            { label: 'Base 300', value: 'bg-base-300' },
            { label: 'Dark Neutral', value: 'bg-neutral text-neutral-content' }
          ]
        }
      ];
    }
  });

  // 23. Mockup Window
  Registry.register({
    id: 'mockup-window',
    name: 'Window Mockup',
    category: 'Layout & Containers',
    match: function(el) {
      return safeClasses(el).includes('mockup-window');
    },
    getProperties: function() {
      return [
        {
          key: 'info',
          name: 'Frame Info',
          type: 'text',
          value: 'DaisyUI Mockup Window Frame',
          onChange: function() {}
        }
      ];
    }
  });

  // 24. Mockup Browser
  Registry.register({
    id: 'mockup-browser',
    name: 'Browser Mockup',
    category: 'Layout & Containers',
    match: function(el) {
      return safeClasses(el).includes('mockup-browser');
    },
    getProperties: function(el) {
      const toolbar = el.querySelector('.mockup-browser-toolbar');
      return [
        {
          key: 'url',
          name: 'URL Bar Text',
          type: 'text',
          value: toolbar ? toolbar.textContent.trim() : 'https://nexus-ux.dev',
          onChange: function(node, val) {
            const tb = node.querySelector('.mockup-browser-toolbar') || node.querySelector('.input');
            if (tb) tb.textContent = val;
          }
        }
      ];
    }
  });

  // 25. Mockup Phone
  Registry.register({
    id: 'mockup-phone',
    name: 'Phone Mockup',
    category: 'Layout & Containers',
    match: function(el) {
      return safeClasses(el).includes('mockup-phone');
    },
    getProperties: function() {
      return [
        {
          key: 'info',
          name: 'Phone Frame',
          type: 'text',
          value: 'Mobile Device Container',
          onChange: function() {}
        }
      ];
    }
  });

  // ==========================================
  // CATEGORY 4: FORM CONTROLS & INPUTS
  // ==========================================

  // 26. Form
  Registry.register({
    id: 'form',
    name: 'Form Container',
    category: 'Form Controls & Inputs',
    match: function(el) {
      return getTag(el) === 'form';
    },
    getProperties: function(el) {
      return [
        {
          key: 'action',
          name: 'Form Action URL',
          type: 'text',
          htmlAttr: 'action',
          value: el.getAttribute('action') || ''
        },
        {
          key: 'method',
          name: 'Method',
          type: 'buttons',
          htmlAttr: 'method',
          value: (el.getAttribute('method') || 'POST').toUpperCase(),
          options: [
            { label: 'POST', value: 'POST' },
            { label: 'GET', value: 'GET' }
          ]
        }
      ];
    }
  });

  // 27. Text Input
  Registry.register({
    id: 'input',
    name: 'Text Input',
    category: 'Form Controls & Inputs',
    match: function(el) {
      const tag = getTag(el);
      const type = el.getAttribute ? el.getAttribute('type') : '';
      return tag === 'input' && (!type || ['text', 'email', 'password', 'url', 'search', 'tel'].includes(type));
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
            { label: 'Search', value: 'search' },
            { label: 'URL', value: 'url' },
            { label: 'Tel', value: 'tel' }
          ]
        },
        {
          key: 'variant',
          name: 'Color Accent',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['input-primary', 'input-secondary', 'input-accent', 'input-info', 'input-success', 'input-warning', 'input-error'],
          value: ['input-primary', 'input-secondary', 'input-accent', 'input-info', 'input-success', 'input-warning', 'input-error'].find(v => cls.includes(v)) || 'none',
          options: [
            { label: 'Default', value: 'none' },
            { label: 'Primary', value: 'input-primary' },
            { label: 'Secondary', value: 'input-secondary' },
            { label: 'Success', value: 'input-success' },
            { label: 'Error', value: 'input-error' }
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
        }
      ];
    }
  });

  // 28. Textarea
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
          name: 'Row Count',
          type: 'number',
          htmlAttr: 'rows',
          value: el.getAttribute('rows') || '3'
        },
        {
          key: 'variant',
          name: 'Color Accent',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['textarea-primary', 'textarea-secondary', 'textarea-accent', 'textarea-success', 'textarea-error'],
          value: ['textarea-primary', 'textarea-secondary', 'textarea-accent', 'textarea-success', 'textarea-error'].find(v => cls.includes(v)) || 'none',
          options: [
            { label: 'Default', value: 'none' },
            { label: 'Primary', value: 'textarea-primary' },
            { label: 'Secondary', value: 'textarea-secondary' },
            { label: 'Success', value: 'textarea-success' }
          ]
        }
      ];
    }
  });

  // 29. Select Dropdown
  Registry.register({
    id: 'select',
    name: 'Select Dropdown',
    category: 'Form Controls & Inputs',
    match: function(el) {
      return getTag(el) === 'select';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'size',
          name: 'Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['select-xs', 'select-sm', 'select-md', 'select-lg'],
          value: ['select-xs', 'select-sm', 'select-md', 'select-lg'].find(s => cls.includes(s)) || 'select-md',
          options: [
            { label: 'XS', value: 'select-xs' },
            { label: 'SM', value: 'select-sm' },
            { label: 'MD', value: 'select-md' },
            { label: 'LG', value: 'select-lg' }
          ]
        },
        {
          key: 'variant',
          name: 'Color Accent',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['select-primary', 'select-secondary', 'select-accent'],
          value: ['select-primary', 'select-secondary', 'select-accent'].find(v => cls.includes(v)) || 'none',
          options: [
            { label: 'Default', value: 'none' },
            { label: 'Primary', value: 'select-primary' },
            { label: 'Secondary', value: 'select-secondary' }
          ]
        }
      ];
    }
  });

  // 30. Checkbox
  Registry.register({
    id: 'checkbox',
    name: 'Checkbox',
    category: 'Form Controls & Inputs',
    match: function(el) {
      return getTag(el) === 'input' && el.getAttribute('type') === 'checkbox' && !safeClasses(el).includes('toggle');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'checked',
          name: 'Checked State',
          type: 'toggle',
          value: el.checked,
          onChange: function(node, val) {
            node.checked = val;
            if (val) node.setAttribute('checked', '');
            else node.removeAttribute('checked');
          }
        },
        {
          key: 'variant',
          name: 'Color Variant',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['checkbox-primary', 'checkbox-secondary', 'checkbox-accent', 'checkbox-success', 'checkbox-warning', 'checkbox-error'],
          value: ['checkbox-primary', 'checkbox-secondary', 'checkbox-accent', 'checkbox-success', 'checkbox-warning', 'checkbox-error'].find(v => cls.includes(v)) || 'checkbox-primary',
          options: [
            { label: 'Primary', value: 'checkbox-primary' },
            { label: 'Secondary', value: 'checkbox-secondary' },
            { label: 'Accent', value: 'checkbox-accent' },
            { label: 'Success', value: 'checkbox-success' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['checkbox-xs', 'checkbox-sm', 'checkbox-md', 'checkbox-lg'],
          value: ['checkbox-xs', 'checkbox-sm', 'checkbox-md', 'checkbox-lg'].find(s => cls.includes(s)) || 'checkbox-md',
          options: [
            { label: 'XS', value: 'checkbox-xs' },
            { label: 'SM', value: 'checkbox-sm' },
            { label: 'MD', value: 'checkbox-md' },
            { label: 'LG', value: 'checkbox-lg' }
          ]
        }
      ];
    }
  });

  // 31. Radio Button
  Registry.register({
    id: 'radio',
    name: 'Radio Button',
    category: 'Form Controls & Inputs',
    match: function(el) {
      return getTag(el) === 'input' && el.getAttribute('type') === 'radio';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'name',
          name: 'Group Name',
          type: 'text',
          htmlAttr: 'name',
          value: el.getAttribute('name') || 'radio-group'
        },
        {
          key: 'variant',
          name: 'Color Variant',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['radio-primary', 'radio-secondary', 'radio-accent', 'radio-success'],
          value: ['radio-primary', 'radio-secondary', 'radio-accent', 'radio-success'].find(v => cls.includes(v)) || 'radio-primary',
          options: [
            { label: 'Primary', value: 'radio-primary' },
            { label: 'Secondary', value: 'radio-secondary' },
            { label: 'Accent', value: 'radio-accent' }
          ]
        }
      ];
    }
  });

  // 32. Toggle Switch
  Registry.register({
    id: 'toggle',
    name: 'Toggle Switch',
    category: 'Form Controls & Inputs',
    match: function(el) {
      return getTag(el) === 'input' && (el.getAttribute('type') === 'checkbox') && safeClasses(el).includes('toggle');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'checked',
          name: 'Toggled On',
          type: 'toggle',
          value: el.checked,
          onChange: function(node, val) {
            node.checked = val;
            if (val) node.setAttribute('checked', '');
            else node.removeAttribute('checked');
          }
        },
        {
          key: 'variant',
          name: 'Color Variant',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['toggle-primary', 'toggle-secondary', 'toggle-accent', 'toggle-success'],
          value: ['toggle-primary', 'toggle-secondary', 'toggle-accent', 'toggle-success'].find(v => cls.includes(v)) || 'toggle-primary',
          options: [
            { label: 'Primary', value: 'toggle-primary' },
            { label: 'Secondary', value: 'toggle-secondary' },
            { label: 'Accent', value: 'toggle-accent' }
          ]
        },
        {
          key: 'size',
          name: 'Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['toggle-xs', 'toggle-sm', 'toggle-md', 'toggle-lg'],
          value: ['toggle-xs', 'toggle-sm', 'toggle-md', 'toggle-lg'].find(s => cls.includes(s)) || 'toggle-md',
          options: [
            { label: 'XS', value: 'toggle-xs' },
            { label: 'SM', value: 'toggle-sm' },
            { label: 'MD', value: 'toggle-md' },
            { label: 'LG', value: 'toggle-lg' }
          ]
        }
      ];
    }
  });

  // 33. Range Slider
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
          key: 'value',
          name: 'Current Value',
          type: 'range',
          htmlAttr: 'value',
          value: el.getAttribute('value') || '50'
        },
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
          key: 'variant',
          name: 'Color Accent',
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

  // 34. File Input
  Registry.register({
    id: 'file-input',
    name: 'File Upload Input',
    category: 'Form Controls & Inputs',
    match: function(el) {
      return getTag(el) === 'input' && (el.getAttribute('type') === 'file' || safeClasses(el).includes('file-input'));
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'size',
          name: 'Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['file-input-xs', 'file-input-sm', 'file-input-md', 'file-input-lg'],
          value: ['file-input-xs', 'file-input-sm', 'file-input-md', 'file-input-lg'].find(s => cls.includes(s)) || 'file-input-md',
          options: [
            { label: 'XS', value: 'file-input-xs' },
            { label: 'SM', value: 'file-input-sm' },
            { label: 'MD', value: 'file-input-md' },
            { label: 'LG', value: 'file-input-lg' }
          ]
        },
        {
          key: 'variant',
          name: 'Color Accent',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['file-input-primary', 'file-input-secondary', 'file-input-accent'],
          value: ['file-input-primary', 'file-input-secondary', 'file-input-accent'].find(v => cls.includes(v)) || 'none',
          options: [
            { label: 'Default', value: 'none' },
            { label: 'Primary', value: 'file-input-primary' },
            { label: 'Secondary', value: 'file-input-secondary' }
          ]
        }
      ];
    }
  });

  // 35. Rating Stars
  Registry.register({
    id: 'rating',
    name: 'Star Rating',
    category: 'Form Controls & Inputs',
    match: function(el) {
      return safeClasses(el).includes('rating');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'size',
          name: 'Star Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['rating-xs', 'rating-sm', 'rating-md', 'rating-lg'],
          value: ['rating-xs', 'rating-sm', 'rating-md', 'rating-lg'].find(s => cls.includes(s)) || 'rating-md',
          options: [
            { label: 'XS', value: 'rating-xs' },
            { label: 'SM', value: 'rating-sm' },
            { label: 'MD', value: 'rating-md' },
            { label: 'LG', value: 'rating-lg' }
          ]
        }
      ];
    }
  });

  // ==========================================
  // CATEGORY 5: CARDS & MEDIA
  // ==========================================

  // 36. Card
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
          key: 'shadow',
          name: 'Elevation / Shadow',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['shadow-none', 'shadow-xs', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'],
          value: ['shadow-none', 'shadow-xs', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'].find(s => cls.includes(s)) || 'shadow',
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
          name: 'Bordered Frame',
          type: 'toggle',
          value: cls.includes('card-border') || cls.includes('border'),
          onChange: function(node, val) {
            if (val) node.classList.add('border', 'border-base-content/10');
            else node.classList.remove('border', 'border-base-content/10');
          }
        },
        {
          key: 'compact',
          name: 'Compact Spacing',
          type: 'toggle',
          value: cls.includes('card-compact') || cls.includes('card-sm'),
          onChange: function(node, val) {
            if (val) node.classList.add('card-sm');
            else node.classList.remove('card-sm');
          }
        },
        {
          key: 'side',
          name: 'Horizontal (Side Image)',
          type: 'toggle',
          value: cls.includes('card-side'),
          onChange: function(node, val) {
            if (val) node.classList.add('card-side');
            else node.classList.remove('card-side');
          }
        }
      ];
    }
  });

  // 37. Card Body
  Registry.register({
    id: 'card-body',
    name: 'Card Body',
    category: 'Cards & Media',
    match: function(el) {
      return safeClasses(el).includes('card-body');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'align',
          name: 'Text Alignment',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['text-left', 'text-center', 'text-right'],
          value: ['text-left', 'text-center', 'text-right'].find(a => cls.includes(a)) || 'text-left',
          options: [
            { label: 'Left', value: 'text-left' },
            { label: 'Center', value: 'text-center' },
            { label: 'Right', value: 'text-right' }
          ]
        }
      ];
    }
  });

  // 38. Image
  Registry.register({
    id: 'img',
    name: 'Image',
    category: 'Cards & Media',
    match: function(el) {
      return getTag(el) === 'img';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'src',
          name: 'Image Source URL',
          type: 'text',
          htmlAttr: 'src',
          value: el.getAttribute('src') || ''
        },
        {
          key: 'alt',
          name: 'Alt Text',
          type: 'text',
          htmlAttr: 'alt',
          value: el.getAttribute('alt') || ''
        },
        {
          key: 'radius',
          name: 'Corner Radius',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['rounded-none', 'rounded-md', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full'],
          value: ['rounded-none', 'rounded-md', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full'].find(r => cls.includes(r)) || 'rounded-xl',
          options: [
            { label: 'Square (None)', value: 'rounded-none' },
            { label: 'Small', value: 'rounded-md' },
            { label: 'Standard (Rounded XL)', value: 'rounded-xl' },
            { label: 'Large (Rounded 3XL)', value: 'rounded-3xl' },
            { label: 'Circle (Full)', value: 'rounded-full' }
          ]
        },
        {
          key: 'fit',
          name: 'Object Fit',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['object-cover', 'object-contain', 'object-fill', 'object-none'],
          value: ['object-cover', 'object-contain', 'object-fill', 'object-none'].find(f => cls.includes(f)) || 'object-cover',
          options: [
            { label: 'Cover', value: 'object-cover' },
            { label: 'Contain', value: 'object-contain' },
            { label: 'Fill', value: 'object-fill' }
          ]
        }
      ];
    }
  });

  // 39. Figure & Caption
  Registry.register({
    id: 'figure',
    name: 'Figure Container',
    category: 'Cards & Media',
    match: function(el) {
      return getTag(el) === 'figure';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'padding',
          name: 'Padding',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['p-0', 'p-2', 'p-4', 'p-6'],
          value: ['p-0', 'p-2', 'p-4', 'p-6'].find(p => cls.includes(p)) || 'p-0',
          options: [
            { label: 'Flush (0)', value: 'p-0' },
            { label: 'Compact (8px)', value: 'p-2' },
            { label: 'Normal (16px)', value: 'p-4' }
          ]
        }
      ];
    }
  });

  // 40. SVG Icon
  Registry.register({
    id: 'svg-icon',
    name: 'SVG Icon',
    category: 'Cards & Media',
    match: function(el) {
      const tag = getTag(el);
      return tag === 'svg' || tag === 'iconify-icon';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const isIconify = getTag(el) === 'iconify-icon';
      const props = [
        {
          key: 'size',
          name: 'Icon Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl'],
          value: ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl'].find(s => cls.includes(s)) || 'text-xl',
          options: [
            { label: 'SM', value: 'text-sm' },
            { label: 'MD', value: 'text-lg' },
            { label: 'LG', value: 'text-2xl' },
            { label: 'XL', value: 'text-4xl' }
          ]
        },
        {
          key: 'color',
          name: 'Color Accent',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['text-primary', 'text-secondary', 'text-accent', 'text-base-content', 'text-success', 'text-error'],
          value: ['text-primary', 'text-secondary', 'text-accent', 'text-success', 'text-error'].find(c => cls.includes(c)) || 'text-primary',
          options: [
            { label: 'Primary', value: 'text-primary' },
            { label: 'Secondary', value: 'text-secondary' },
            { label: 'Accent', value: 'text-accent' },
            { label: 'Current Content', value: 'text-base-content' }
          ]
        }
      ];
      if (isIconify) {
        props.unshift({
          key: 'icon',
          name: 'Icon ID',
          type: 'text',
          htmlAttr: 'icon',
          value: el.getAttribute('icon') || 'material-symbols-light:check'
        });
      }
      return props;
    }
  });

  // 41. Video Player
  Registry.register({
    id: 'video',
    name: 'Video Player',
    category: 'Cards & Media',
    match: function(el) {
      return getTag(el) === 'video';
    },
    getProperties: function(el) {
      return [
        {
          key: 'src',
          name: 'Video Source URL',
          type: 'text',
          htmlAttr: 'src',
          value: el.getAttribute('src') || ''
        },
        {
          key: 'controls',
          name: 'Show Controls',
          type: 'toggle',
          value: el.hasAttribute('controls'),
          onChange: function(node, val) {
            if (val) node.setAttribute('controls', '');
            else node.removeAttribute('controls');
          }
        },
        {
          key: 'autoplay',
          name: 'Autoplay',
          type: 'toggle',
          value: el.hasAttribute('autoplay'),
          onChange: function(node, val) {
            if (val) node.setAttribute('autoplay', '');
            else node.removeAttribute('autoplay');
          }
        },
        {
          key: 'loop',
          name: 'Loop Video',
          type: 'toggle',
          value: el.hasAttribute('loop'),
          onChange: function(node, val) {
            if (val) node.setAttribute('loop', '');
            else node.removeAttribute('loop');
          }
        }
      ];
    }
  });

  // 42. Audio Player
  Registry.register({
    id: 'audio',
    name: 'Audio Player',
    category: 'Cards & Media',
    match: function(el) {
      return getTag(el) === 'audio';
    },
    getProperties: function(el) {
      return [
        {
          key: 'src',
          name: 'Audio Source URL',
          type: 'text',
          htmlAttr: 'src',
          value: el.getAttribute('src') || ''
        },
        {
          key: 'controls',
          name: 'Show Controls',
          type: 'toggle',
          value: el.hasAttribute('controls'),
          onChange: function(node, val) {
            if (val) node.setAttribute('controls', '');
            else node.removeAttribute('controls');
          }
        }
      ];
    }
  });

  // 43. Embed / Iframe
  Registry.register({
    id: 'iframe',
    name: 'Responsive Iframe',
    category: 'Cards & Media',
    match: function(el) {
      return getTag(el) === 'iframe';
    },
    getProperties: function(el) {
      return [
        {
          key: 'src',
          name: 'Source URL',
          type: 'text',
          htmlAttr: 'src',
          value: el.getAttribute('src') || ''
        },
        {
          key: 'title',
          name: 'Iframe Title',
          type: 'text',
          htmlAttr: 'title',
          value: el.getAttribute('title') || 'Embedded Content'
        }
      ];
    }
  });

  // 44. Avatar & Avatar Group
  Registry.register({
    id: 'avatar',
    name: 'Avatar',
    category: 'Cards & Media',
    match: function(el) {
      return safeClasses(el).includes('avatar') || safeClasses(el).includes('avatar-group');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'size',
          name: 'Avatar Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['w-8 h-8', 'w-10 h-10', 'w-12 h-12', 'w-16 h-16'],
          value: ['w-8 h-8', 'w-10 h-10', 'w-12 h-12', 'w-16 h-16'].find(s => cls.includes(s)) || 'w-10 h-10',
          options: [
            { label: 'SM', value: 'w-8 h-8' },
            { label: 'MD', value: 'w-10 h-10' },
            { label: 'LG', value: 'w-12 h-12' },
            { label: 'XL', value: 'w-16 h-16' }
          ]
        },
        {
          key: 'shape',
          name: 'Mask Shape',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['rounded-full', 'mask mask-squircle', 'mask mask-hexagon'],
          value: cls.includes('mask-squircle') ? 'mask mask-squircle' : 'rounded-full',
          options: [
            { label: 'Circle', value: 'rounded-full' },
            { label: 'Squircle', value: 'mask mask-squircle' },
            { label: 'Hexagon', value: 'mask mask-hexagon' }
          ]
        }
      ];
    }
  });

  // ==========================================
  // CATEGORY 6: NAVIGATION & MENUS
  // ==========================================

  // 45. Navbar
  Registry.register({
    id: 'navbar',
    name: 'Navbar',
    category: 'Navigation & Menus',
    match: function(el) {
      return safeClasses(el).includes('navbar');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'bg',
          name: 'Background Tone',
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
          key: 'shadow',
          name: 'Shadow',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['shadow-none', 'shadow-xs', 'shadow-sm', 'shadow-md'],
          value: ['shadow-none', 'shadow-xs', 'shadow-sm', 'shadow-md'].find(s => cls.includes(s)) || 'shadow-sm',
          options: [
            { label: 'None', value: 'shadow-none' },
            { label: 'Subtle', value: 'shadow-xs' },
            { label: 'Standard', value: 'shadow-sm' },
            { label: 'Elevated', value: 'shadow-md' }
          ]
        }
      ];
    }
  });

  // 46. Nav Menu
  Registry.register({
    id: 'nav-menu',
    name: 'Nav Menu',
    category: 'Navigation & Menus',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('menu-horizontal');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'size',
          name: 'Menu Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['menu-xs', 'menu-sm', 'menu-md'],
          value: ['menu-xs', 'menu-sm', 'menu-md'].find(s => cls.includes(s)) || 'menu-sm',
          options: [
            { label: 'XS', value: 'menu-xs' },
            { label: 'SM', value: 'menu-sm' },
            { label: 'MD', value: 'menu-md' }
          ]
        }
      ];
    }
  });

  // 47. Dropdown
  Registry.register({
    id: 'dropdown',
    name: 'Dropdown',
    category: 'Navigation & Menus',
    match: function(el) {
      return safeClasses(el).includes('dropdown');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'hover',
          name: 'Open on Hover',
          type: 'toggle',
          value: cls.includes('dropdown-hover'),
          onChange: function(node, val) {
            if (val) node.classList.add('dropdown-hover');
            else node.classList.remove('dropdown-hover');
          }
        },
        {
          key: 'position',
          name: 'Menu Placement',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['dropdown-bottom', 'dropdown-top', 'dropdown-end', 'dropdown-left', 'dropdown-right'],
          value: ['dropdown-bottom', 'dropdown-top', 'dropdown-end', 'dropdown-left', 'dropdown-right'].find(p => cls.includes(p)) || 'dropdown-bottom',
          options: [
            { label: 'Bottom (Default)', value: 'dropdown-bottom' },
            { label: 'Bottom End', value: 'dropdown-bottom dropdown-end' },
            { label: 'Top', value: 'dropdown-top' },
            { label: 'Right', value: 'dropdown-right' }
          ]
        }
      ];
    }
  });

  // 48. Breadcrumbs
  Registry.register({
    id: 'breadcrumbs',
    name: 'Breadcrumbs',
    category: 'Navigation & Menus',
    match: function(el) {
      return safeClasses(el).includes('breadcrumbs');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'size',
          name: 'Text Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['text-xs', 'text-sm', 'text-base'],
          value: ['text-xs', 'text-sm', 'text-base'].find(s => cls.includes(s)) || 'text-xs',
          options: [
            { label: 'XS', value: 'text-xs' },
            { label: 'SM', value: 'text-sm' },
            { label: 'MD', value: 'text-base' }
          ]
        }
      ];
    }
  });

  // 49. Pagination
  Registry.register({
    id: 'pagination',
    name: 'Pagination',
    category: 'Navigation & Menus',
    match: function(el) {
      const cls = safeClasses(el);
      return cls.includes('pagination') || (cls.includes('join') && el.querySelector('.join-item'));
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'size',
          name: 'Button Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['pagination-xs', 'pagination-sm', 'pagination-md'],
          value: 'pagination-sm',
          options: [
            { label: 'XS', value: 'pagination-xs' },
            { label: 'SM', value: 'pagination-sm' },
            { label: 'MD', value: 'pagination-md' }
          ]
        }
      ];
    }
  });

  // 50. Tabs
  Registry.register({
    id: 'tabs',
    name: 'Tabs',
    category: 'Navigation & Menus',
    match: function(el) {
      return safeClasses(el).includes('tabs');
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
          value: ['tabs-bordered', 'tabs-lifted', 'tabs-box'].find(s => cls.includes(s)) || 'tabs-bordered',
          options: [
            { label: 'Bordered', value: 'tabs-bordered' },
            { label: 'Lifted Cards', value: 'tabs-lifted' },
            { label: 'Box Container', value: 'tabs-box' }
          ]
        },
        {
          key: 'size',
          name: 'Tab Size',
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

  // 51. Tab Item
  Registry.register({
    id: 'tab',
    name: 'Tab Item',
    category: 'Navigation & Menus',
    match: function(el) {
      return safeClasses(el).includes('tab');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'text',
          name: 'Tab Title',
          type: 'text',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'active',
          name: 'Active Tab',
          type: 'toggle',
          value: cls.includes('tab-active'),
          onChange: function(node, val) {
            if (val) node.classList.add('tab-active');
            else node.classList.remove('tab-active');
          }
        }
      ];
    }
  });

  // 52. Collapse / Accordion
  Registry.register({
    id: 'collapse',
    name: 'Collapse / Accordion',
    category: 'Navigation & Menus',
    match: function(el) {
      return safeClasses(el).includes('collapse');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'icon',
          name: 'Toggle Icon',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['collapse-arrow', 'collapse-plus'],
          value: cls.includes('collapse-plus') ? 'collapse-plus' : 'collapse-arrow',
          options: [
            { label: 'Arrow', value: 'collapse-arrow' },
            { label: 'Plus / Minus', value: 'collapse-plus' }
          ]
        },
        {
          key: 'open',
          name: 'Expanded by Default',
          type: 'toggle',
          value: cls.includes('collapse-open'),
          onChange: function(node, val) {
            if (val) node.classList.add('collapse-open');
            else node.classList.remove('collapse-open');
          }
        }
      ];
    }
  });

  // 53. Steps Indicator
  Registry.register({
    id: 'steps',
    name: 'Steps Progress',
    category: 'Navigation & Menus',
    match: function(el) {
      return safeClasses(el).includes('steps');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'orientation',
          name: 'Orientation',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['steps-horizontal', 'steps-vertical'],
          value: cls.includes('steps-vertical') ? 'steps-vertical' : 'steps-horizontal',
          options: [
            { label: 'Horizontal', value: 'steps-horizontal' },
            { label: 'Vertical', value: 'steps-vertical' }
          ]
        }
      ];
    }
  });

  // 54. Bottom Navigation
  Registry.register({
    id: 'btm-nav',
    name: 'Bottom Navigation',
    category: 'Navigation & Menus',
    match: function(el) {
      return safeClasses(el).includes('btm-nav');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'size',
          name: 'Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['btm-nav-xs', 'btm-nav-sm', 'btm-nav-md'],
          value: ['btm-nav-xs', 'btm-nav-sm', 'btm-nav-md'].find(s => cls.includes(s)) || 'btm-nav-md',
          options: [
            { label: 'XS', value: 'btm-nav-xs' },
            { label: 'SM', value: 'btm-nav-sm' },
            { label: 'MD', value: 'btm-nav-md' }
          ]
        }
      ];
    }
  });

  // ==========================================
  // CATEGORY 7: FEEDBACK, INDICATORS & OVERLAYS
  // ==========================================

  // 55. Alert Banner
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
          name: 'Alert Variant',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['alert-info', 'alert-success', 'alert-warning', 'alert-error'],
          value: ['alert-info', 'alert-success', 'alert-warning', 'alert-error'].find(v => cls.includes(v)) || 'alert-info',
          options: [
            { label: 'Info (Blue)', value: 'alert-info' },
            { label: 'Success (Green)', value: 'alert-success' },
            { label: 'Warning (Yellow)', value: 'alert-warning' },
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
            { label: 'Standard Solid', value: 'none' },
            { label: 'Soft Tone', value: 'alert-soft' },
            { label: 'Dashed Border', value: 'alert-dash' },
            { label: 'Outline', value: 'alert-outline' }
          ]
        }
      ];
    }
  });

  // 56. Progress Bar
  Registry.register({
    id: 'progress',
    name: 'Progress Bar',
    category: 'Feedback & Overlays',
    match: function(el) {
      return getTag(el) === 'progress' || safeClasses(el).includes('progress');
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

  // 57. Radial Progress
  Registry.register({
    id: 'radial-progress',
    name: 'Radial Progress',
    category: 'Feedback & Overlays',
    match: function(el) {
      return safeClasses(el).includes('radial-progress');
    },
    getProperties: function(el) {
      return [
        {
          key: 'value',
          name: 'Percentage (0-100)',
          type: 'number',
          value: el.style.getPropertyValue('--value') || '70',
          onChange: function(node, val) {
            node.style.setProperty('--value', val);
            node.textContent = val + '%';
          }
        }
      ];
    }
  });

  // 58. Loading Indicator
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

  // 59. Tooltip
  Registry.register({
    id: 'tooltip',
    name: 'Tooltip',
    category: 'Feedback & Overlays',
    match: function(el) {
      return safeClasses(el).includes('tooltip');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'tip',
          name: 'Tooltip Message',
          type: 'text',
          htmlAttr: 'data-tip',
          value: el.getAttribute('data-tip') || 'Tooltip message'
        },
        {
          key: 'position',
          name: 'Direction',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['tooltip-top', 'tooltip-bottom', 'tooltip-left', 'tooltip-right'],
          value: ['tooltip-top', 'tooltip-bottom', 'tooltip-left', 'tooltip-right'].find(p => cls.includes(p)) || 'tooltip-top',
          options: [
            { label: 'Top', value: 'tooltip-top' },
            { label: 'Bottom', value: 'tooltip-bottom' },
            { label: 'Left', value: 'tooltip-left' },
            { label: 'Right', value: 'tooltip-right' }
          ]
        }
      ];
    }
  });

  // 60. Modal Dialog
  Registry.register({
    id: 'modal',
    name: 'Modal Dialog',
    category: 'Feedback & Overlays',
    match: function(el) {
      const tag = getTag(el);
      const cls = safeClasses(el);
      return tag === 'dialog' || cls.includes('modal');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'position',
          name: 'Position',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['modal-middle', 'modal-bottom'],
          value: cls.includes('modal-bottom') ? 'modal-bottom' : 'modal-middle',
          options: [
            { label: 'Centered', value: 'modal-middle' },
            { label: 'Bottom Sheet', value: 'modal-bottom' }
          ]
        }
      ];
    }
  });

  // 61. Stats Grid
  Registry.register({
    id: 'stats',
    name: 'Stats Grid',
    category: 'Feedback & Overlays',
    match: function(el) {
      return safeClasses(el).includes('stats');
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

  // 62. Stat Item
  Registry.register({
    id: 'stat',
    name: 'Stat Counter Item',
    category: 'Feedback & Overlays',
    match: function(el) {
      return safeClasses(el).includes('stat');
    },
    getProperties: function(el) {
      const titleEl = el.querySelector('.stat-title');
      const valEl = el.querySelector('.stat-value');
      const descEl = el.querySelector('.stat-desc');
      return [
        {
          key: 'title',
          name: 'Stat Label',
          type: 'text',
          value: titleEl ? titleEl.textContent.trim() : 'Metric',
          onChange: function(node, val) {
            const t = node.querySelector('.stat-title');
            if (t) t.textContent = val;
          }
        },
        {
          key: 'value',
          name: 'Value',
          type: 'text',
          value: valEl ? valEl.textContent.trim() : '100%',
          onChange: function(node, val) {
            const v = node.querySelector('.stat-value');
            if (v) v.textContent = val;
          }
        },
        {
          key: 'desc',
          name: 'Description Note',
          type: 'text',
          value: descEl ? descEl.textContent.trim() : '',
          onChange: function(node, val) {
            const d = node.querySelector('.stat-desc');
            if (d) d.textContent = val;
          }
        }
      ];
    }
  });

  // 63. Indicator Badge Dot
  Registry.register({
    id: 'indicator',
    name: 'Indicator Badge',
    category: 'Feedback & Overlays',
    match: function(el) {
      return safeClasses(el).includes('indicator');
    },
    getProperties: function() {
      return [
        {
          key: 'info',
          name: 'Indicator Frame',
          type: 'text',
          value: 'Badge Notification Wrapper',
          onChange: function() {}
        }
      ];
    }
  });

  // 64. Countdown Display
  Registry.register({
    id: 'countdown',
    name: 'Countdown Display',
    category: 'Feedback & Overlays',
    match: function(el) {
      return safeClasses(el).includes('countdown');
    },
    getProperties: function() {
      return [
        {
          key: 'info',
          name: 'Countdown Numbers',
          type: 'text',
          value: 'CSS Counter Display',
          onChange: function() {}
        }
      ];
    }
  });

  // 65. Diff View
  Registry.register({
    id: 'diff',
    name: 'Diff Image Comparison',
    category: 'Feedback & Overlays',
    match: function(el) {
      return safeClasses(el).includes('diff');
    },
    getProperties: function() {
      return [
        {
          key: 'info',
          name: 'Split View',
          type: 'text',
          value: 'DaisyUI Diff Comparison Container',
          onChange: function() {}
        }
      ];
    }
  });

  // 66. Timeline
  Registry.register({
    id: 'timeline',
    name: 'Timeline',
    category: 'Feedback & Overlays',
    match: function(el) {
      return safeClasses(el).includes('timeline');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'orientation',
          name: 'Orientation',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['timeline-vertical', 'timeline-horizontal'],
          value: cls.includes('timeline-vertical') ? 'timeline-vertical' : 'timeline-horizontal',
          options: [
            { label: 'Vertical', value: 'timeline-vertical' },
            { label: 'Horizontal', value: 'timeline-horizontal' }
          ]
        }
      ];
    }
  });

  // ==========================================
  // CATEGORY 8: TABLES & DATA DISPLAY
  // ==========================================

  // 67. Table
  Registry.register({
    id: 'table',
    name: 'Data Table',
    category: 'Tables & Data Display',
    match: function(el) {
      return getTag(el) === 'table' || safeClasses(el).includes('table');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'zebra',
          name: 'Zebra Striping',
          type: 'toggle',
          value: cls.includes('table-zebra'),
          onChange: function(node, val) {
            if (val) node.classList.add('table-zebra');
            else node.classList.remove('table-zebra');
          }
        },
        {
          key: 'size',
          name: 'Table Size',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['table-xs', 'table-sm', 'table-md', 'table-lg'],
          value: ['table-xs', 'table-sm', 'table-md', 'table-lg'].find(s => cls.includes(s)) || 'table-md',
          options: [
            { label: 'XS', value: 'table-xs' },
            { label: 'SM', value: 'table-sm' },
            { label: 'MD', value: 'table-md' },
            { label: 'LG', value: 'table-lg' }
          ]
        },
        {
          key: 'pinRows',
          name: 'Pin Header Rows',
          type: 'toggle',
          value: cls.includes('table-pin-rows'),
          onChange: function(node, val) {
            if (val) node.classList.add('table-pin-rows');
            else node.classList.remove('table-pin-rows');
          }
        }
      ];
    }
  });

  // 68. Table Row
  Registry.register({
    id: 'table-row',
    name: 'Table Row',
    category: 'Tables & Data Display',
    match: function(el) {
      return getTag(el) === 'tr';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'hover',
          name: 'Hover Highlight',
          type: 'toggle',
          value: cls.includes('hover'),
          onChange: function(node, val) {
            if (val) node.classList.add('hover');
            else node.classList.remove('hover');
          }
        }
      ];
    }
  });

  // 69. Table Cell (TH / TD)
  Registry.register({
    id: 'table-cell',
    name: 'Table Cell',
    category: 'Tables & Data Display',
    match: function(el) {
      const tag = getTag(el);
      return tag === 'th' || tag === 'td';
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'text',
          name: 'Cell Content',
          type: 'text',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'align',
          name: 'Text Alignment',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['text-left', 'text-center', 'text-right'],
          value: ['text-left', 'text-center', 'text-right'].find(a => cls.includes(a)) || 'text-left',
          options: [
            { label: 'Left', value: 'text-left' },
            { label: 'Center', value: 'text-center' },
            { label: 'Right', value: 'text-right' }
          ]
        }
      ];
    }
  });

  // ==========================================
  // CATEGORY 9: INTERACTIVE WIDGETS & SECTIONS
  // ==========================================

  // 70. Carousel
  Registry.register({
    id: 'carousel',
    name: 'Carousel Slider',
    category: 'Interactive Widgets',
    match: function(el) {
      return safeClasses(el).includes('carousel');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'mode',
          name: 'Snap Alignment',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['carousel-center', 'carousel-end'],
          value: cls.includes('carousel-center') ? 'carousel-center' : 'none',
          options: [
            { label: 'Start', value: 'none' },
            { label: 'Center', value: 'carousel-center' },
            { label: 'End', value: 'carousel-end' }
          ]
        }
      ];
    }
  });

  // 71. Chat Bubble
  Registry.register({
    id: 'chat',
    name: 'Chat Message',
    category: 'Interactive Widgets',
    match: function(el) {
      return safeClasses(el).includes('chat') || safeClasses(el).includes('chat-bubble');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      const bubble = el.querySelector('.chat-bubble') || el;
      return [
        {
          key: 'message',
          name: 'Message Content',
          type: 'textarea',
          value: bubble.textContent.trim(),
          onChange: function(node, val) {
            const b = node.querySelector('.chat-bubble') || node;
            b.textContent = val;
          }
        },
        {
          key: 'direction',
          name: 'Direction',
          type: 'buttons',
          htmlAttr: 'class',
          validValues: ['chat-start', 'chat-end'],
          value: cls.includes('chat-end') ? 'chat-end' : 'chat-start',
          options: [
            { label: 'Incoming (Start)', value: 'chat-start' },
            { label: 'Outgoing (End)', value: 'chat-end' }
          ]
        },
        {
          key: 'variant',
          name: 'Bubble Variant',
          type: 'select',
          validValues: ['chat-bubble-primary', 'chat-bubble-secondary', 'chat-bubble-accent', 'chat-bubble-info', 'chat-bubble-success', 'chat-bubble-warning', 'chat-bubble-error'],
          value: 'chat-bubble-primary',
          options: [
            { label: 'Primary', value: 'chat-bubble-primary' },
            { label: 'Secondary', value: 'chat-bubble-secondary' },
            { label: 'Accent', value: 'chat-bubble-accent' }
          ],
          onChange: function(node, val) {
            const b = node.querySelector('.chat-bubble') || node;
            ['chat-bubble-primary', 'chat-bubble-secondary', 'chat-bubble-accent', 'chat-bubble-info', 'chat-bubble-success', 'chat-bubble-warning', 'chat-bubble-error'].forEach(c => b.classList.remove(c));
            if (val) b.classList.add(val);
          }
        }
      ];
    }
  });

  // 72. Hyperlink
  Registry.register({
    id: 'link',
    name: 'Hyperlink',
    category: 'Typography & Structure',
    match: function(el) {
      return getTag(el) === 'a' && !safeClasses(el).includes('btn') && !safeClasses(el).includes('tab');
    },
    getProperties: function(el) {
      const cls = safeClasses(el);
      return [
        {
          key: 'text',
          name: 'Link Text',
          type: 'text',
          value: el.textContent.trim(),
          onChange: function(node, val) { node.textContent = val; }
        },
        {
          key: 'href',
          name: 'Target URL',
          type: 'text',
          htmlAttr: 'href',
          value: el.getAttribute('href') || '#'
        },
        {
          key: 'target',
          name: 'Open In',
          type: 'buttons',
          htmlAttr: 'target',
          value: el.getAttribute('target') || '_self',
          options: [
            { label: 'Same Window', value: '_self' },
            { label: 'New Tab', value: '_blank' }
          ]
        },
        {
          key: 'color',
          name: 'Color Accent',
          type: 'select',
          htmlAttr: 'class',
          validValues: ['link-primary', 'link-secondary', 'link-accent', 'link-neutral', 'link-hover'],
          value: ['link-primary', 'link-secondary', 'link-accent', 'link-neutral'].find(c => cls.includes(c)) || 'link-primary',
          options: [
            { label: 'Primary', value: 'link-primary' },
            { label: 'Secondary', value: 'link-secondary' },
            { label: 'Accent', value: 'link-accent' },
            { label: 'Neutral', value: 'link-neutral' }
          ]
        }
      ];
    }
  });

  // Expose to window
  window.NexusBuilderComponents = Registry;

})();
