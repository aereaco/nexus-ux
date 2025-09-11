import { magic } from '../engine/magics'
import { closestIdRoot, findAndIncrementId } from '../engine/ids'
import { interceptClone } from '../engine/clone'

magic('id', (el: any, { cleanup }: any) => (name: string, key: string | null = null) => {
    let cacheKey = `${name}${key ? `-${key}` : ''}`

    return cacheIdByNameOnElement(el, cacheKey, cleanup, () => {
        let root = closestIdRoot(el, name)

        let id = root
            ? root._data_ids[name]
            : findAndIncrementId(name)

        return key
            ? `${name}-${id}-${key}`
            : `${name}-${id}`
    })
})

interceptClone((from: any, to: any) => {
    // Transfer over existing ID registrations from
    // the existing dom tree over to the new one
    // so that there aren't ID mismatches...
    if (from._data_id) {
        to._data_id = from._data_id
    }
})

function cacheIdByNameOnElement(el: any, cacheKey: string, cleanup: any, callback: any)
{
    if (! el._data_id) el._data_id = {}

    // We only want $id to run once per an element's lifecycle...
    if (el._data_id[cacheKey]) return el._data_id[cacheKey]

    let output = callback()

    el._data_id[cacheKey] = output

    cleanup(() => {
        delete el._data_id[cacheKey]
    })

    return output
}
