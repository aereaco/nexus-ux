let signals: Record<string, any> = {}

export function signal(name: string, callback: any) {
    signals[name] = callback
}

export function injectSignalProviders(obj: any, context?: any) {
    Object.entries(signals).forEach(([name, callback]) => {
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
