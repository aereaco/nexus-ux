export function once<T extends (...args: any[]) => any>(callback: T, fallback: T = (() => {}) as any): (...args: Parameters<T>) => ReturnType<T> {
    let called = false

    return function (this: any, ...args: any[]) {
        if (! called) {
            called = true

            return callback.apply(this, args)
        } else {
            return fallback.apply(this, args)
        }
    } as any
}

