// Warning: The concept of "interceptors" in Nexus-UX is not public API and is subject to change
// without tagging a major release.

export function initInterceptors(signal: any) {
    let isObject = (val: any) => typeof val === 'object' && !Array.isArray(val) && val !== null

    let recurse = (obj: any, basePath = '') => {
        Object.entries(Object.getOwnPropertyDescriptors(obj)).forEach(([key, { value, enumerable }]: any) => {
            // Skip getters.
            if (enumerable === false || value === undefined) return
            if (typeof value === 'object' && value !== null && value.__v_skip) return

            let path = basePath === '' ? key : `${basePath}.${key}`

            if (typeof value === 'object' && value !== null && value._data_interceptor) {
                obj[key] = value.initialize(signal, path, key)
            } else {
                if (isObject(value) && value !== obj && ! (value instanceof Element)) {
                    recurse(value, path)
                }
            }
        })
    }

    return recurse(signal)
}

export function interceptor(callback: any, mutateObj: any = () => {}) {
    let obj: any = {
        initialValue: undefined,

        _data_interceptor: true,

        initialize(signal: any, path: any, key: any) {
            return callback(this.initialValue, () => get(signal, path), (value: any) => set(signal, path, value), path, key)
        }
    }

    mutateObj(obj)

    return (initialValue: any) => {
        if (typeof initialValue === 'object' && initialValue !== null && initialValue._data_interceptor) {
            // Support nesting interceptors.
            let initialize = obj.initialize.bind(obj)

            obj.initialize = (signal: any, path: any, key: any) => {
                let innerValue = initialValue.initialize(signal, path, key)

                obj.initialValue = innerValue

                return initialize(signal, path, key)
            }
        } else {
            obj.initialValue = initialValue
        }

        return obj
    }
}

function get(obj: any, path: string) {
    return path.split('.').reduce((carry: any, segment: string) => carry[segment], obj)
}

function set(obj: any, path: any, value: any) {
    if (typeof path === 'string') path = path.split('.')

    if (path.length === 1) obj[path[0]] = value;
    else if (path.length === 0) throw new Error('Path length is zero')
    else {
       if (obj[path[0]])
          return set(obj[path[0]], path.slice(1), value);
       else {
          obj[path[0]] = {};
          return set(obj[path[0]], path.slice(1), value);
       }
    }
}
