import { directive } from '../directives'
import { warn } from '../utils/warn'

import './transition'
import './modelable'
import './intersect'
import './teleport'
import './collapse'
import './persist'
import './signal'
import './anchor'
import './resize'
import './ignore'
import './effect'
import './focus'
import './model'
import './cloak'
import './sort'
import './mask'
import './init'
import './text'
import './html'
import './bind'
import './show'
import './for'
import './ref'
import './if'
import './id'
import './on'

// Register warnings for people using plugin syntaxes and not loading the plugin itself:
//warnMissingPluginDirective('Collapse', 'collapse', 'collapse')
//warnMissingPluginDirective('Intersect', 'intersect', 'intersect')
//warnMissingPluginDirective('Focus', 'trap', 'focus')
//warnMissingPluginDirective('Mask', 'mask', 'mask')

function warnMissingPluginDirective(name: any, directiveName: any, slug: any) {
    directive(directiveName, (el: any) => warn(`You can't use [data-${directiveName}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el))
}
