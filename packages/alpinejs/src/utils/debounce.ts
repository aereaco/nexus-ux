export function debounce(func: (...args: any[]) => void, wait: number) {
    var timeout: any

    return function(this: any) {
        var context = this, args = arguments

        var later = function () {
            timeout = null

            func.apply(context, args as any)
        }

        clearTimeout(timeout)

        timeout = setTimeout(later, wait)
    }
}

