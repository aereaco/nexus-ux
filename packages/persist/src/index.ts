export default function (Alpine: any) {
    let persist = () => {
        let alias: any
        let storage: any

        try {
            storage = localStorage
        } catch (e) {
            console.error(e)
            console.warn('Alpine: $persist is using temporary storage since localStorage is unavailable.')

            let dummy = new Map();

            storage = {
                getItem: dummy.get.bind(dummy),
                setItem: dummy.set.bind(dummy)
            }
        }

        return Alpine.interceptor((initialValue: any, getter: any, setter: any, path: any, key: any) => {
            let lookup = alias || `_data_${path}`

            let initial = storageHas(lookup, storage)
                ? storageGet(lookup, storage)
                : initialValue

            setter(initial)

            Alpine.effect(() => {
                let value = getter()

                storageSet(lookup, value, storage)

                setter(value)
            })

            return initial
        }, (func: any) => {
            func.as = (key: any) => { alias = key; return func },
            func.using = (target: any) => { storage = target; return func }
        })
    }

    Object.defineProperty(Alpine, '$persist', { get: () => persist() })
    Alpine.magic('persist', persist)
    Alpine.persist = (key: any, { get, set }: any, storage: any = localStorage) => {
        let initial = storageHas(key, storage)
            ? storageGet(key, storage)
            : get()

        set(initial)

        Alpine.effect(() => {
            let value = get()

            storageSet(key, value, storage)

            set(value)
        })
    }
}

function storageHas(key: any, storage: any) {
    return storage.getItem(key) !== null
}

function storageGet(key: any, storage: any) {
    let value = storage.getItem(key, storage)

    if (value === undefined) return

    return JSON.parse(value)
}

function storageSet(key: any, value: any, storage: any) {
    storage.setItem(key, JSON.stringify(value))
}
