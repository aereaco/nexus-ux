export function throttle(func: any, limit: number) {
    let inThrottle: boolean | undefined

    return function(this: any, ...args: any[]) {
        let context = this

        if (! inThrottle) {
            func.apply(context, args)

            inThrottle = true

            setTimeout(() => inThrottle = false, limit)
        }
    }
}
