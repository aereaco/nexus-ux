import { findClosest } from './lifecycle'

let globalIdMemo: Record<string, number> = {}

export function findAndIncrementId(name: string) {
    if (! globalIdMemo[name]) globalIdMemo[name] = 0

    return ++globalIdMemo[name]
}

export function closestIdRoot(el: any, name: string) {
    return findClosest(el, (element: any) => {
        if (element._data_ids && element._data_ids[name]) return true
    })
}

export function setIdRoot(el: any, name: string) {
    if (! el._data_ids) el._data_ids = {}
    if (! el._data_ids[name]) el._data_ids[name] = findAndIncrementId(name) 
}
