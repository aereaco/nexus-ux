import { /*closestRoot,*/ findClosest } from '../engine/lifecycle'
import { mergeProxies } from '../engine/scope'
import { magic } from '../engine/magics'

magic('refs', (el: any) => {
    if (el._data_refs_proxy) return el._data_refs_proxy

    el._data_refs_proxy = mergeProxies(getArrayOfRefObject(el))

    return el._data_refs_proxy
})

function getArrayOfRefObject(el: any) {
    let refObjects: any[] = []

    findClosest(el, (i: any) => {
        if (i._data_refs) refObjects.push(i._data_refs)
    })

    return refObjects
}
