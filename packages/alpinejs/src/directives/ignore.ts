import { directive } from "../directives"

let handler: any = () => {}

handler.inline = (el: any, { modifiers }: any, { cleanup }: any) => {
    modifiers.includes('self')
        ? el._data_ignoreSelf = true
        : el._data_ignore = true

    cleanup(() => {
        modifiers.includes('self')
            ? delete el._data_ignoreSelf
            : delete el._data_ignore
    })
}

directive('ignore', handler)
