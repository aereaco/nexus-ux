import { directive } from '../engine/directives'
import { mutateDom } from '../engine/mutation'

directive('text', (el: any, { expression }: any, { effect, evaluateLater }: any) => {
    let evaluate = evaluateLater(expression)

    effect(() => {
        evaluate((value: any) => {
            mutateDom(() => {
                el.textContent = value
            })
        })
    })
})
