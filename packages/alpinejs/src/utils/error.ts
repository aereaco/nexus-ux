export function tryCatch(el: any, expression: any, callback: any, ...args: any[]) {
    try {
        return callback(...args)
    } catch (e: any) {
        handleError( e, el, expression )
    }
}

export function handleError(error: any , el: any, expression: any = undefined) {
    error = Object.assign( 
        error ?? { message: 'No error message given.' }, 
        { el, expression } )

    console.warn(`Alpine Expression Error: ${error.message}\n\n${ expression ? 'Expression: "' + expression + '"\n\n' : '' }`, el)

    setTimeout( () => { throw error }, 0 )
}
