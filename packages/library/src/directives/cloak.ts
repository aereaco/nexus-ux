import { directive, prefix } from '../engine/directives'
import { mutateDom } from '../engine/mutation'

directive('cloak', (el: any) => queueMicrotask(() => mutateDom(() => el.removeAttribute(prefix('cloak')))))
