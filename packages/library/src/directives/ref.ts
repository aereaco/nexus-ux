import { closestRoot } from '../engine/lifecycle'
import { directive } from '../engine/directives'

function handler () {}

handler.inline = (el: any, { expression }: any, { cleanup }: any) => {
    let root = closestRoot(el)

    if (! root._data_refs) root._data_refs = {}

    root._data_refs[expression] = el

    cleanup(() => delete root._data_refs[expression])
}

directive('ref', handler)
