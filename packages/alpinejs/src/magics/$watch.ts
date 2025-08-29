import { magic } from '../magics'
import { watch } from '../reactivity'

magic('watch', (el: any, { evaluateLater, cleanup }: any) => (key: any, callback: any) => {
    let evaluate = evaluateLater(key)

    let getter = () => {
        let value: any

        evaluate((i: any) => value = i)

        return value
    }

    let unwatch = watch(getter, callback)

    cleanup(unwatch)
})

