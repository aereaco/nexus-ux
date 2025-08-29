import { interceptClone } from "../clone"
import { directive } from "../directives"
import { setIdRoot } from '../ids'

directive('id', (el: any, { expression }: any, { evaluate }: any) => {
    let names = evaluate(expression)

    names.forEach((name: any) => setIdRoot(el, name))
})

interceptClone((from: any, to: any) => {
    if (from._data_ids) {
        to._data_ids = from._data_ids
    }
})
