let datas: Record<string, any> = {}

export function data(name: string, callback: any) {
    datas[name] = callback
}

export function injectDataProviders(obj: any, context?: any) {
    Object.entries(datas).forEach(([name, callback]) => {
        Object.defineProperty(obj, name, {
            get() {
                return (...args: any[]) => {
                    return callback.bind(context)(...args)
                }
            },

            enumerable: false,
        })
    })

    return obj
}
