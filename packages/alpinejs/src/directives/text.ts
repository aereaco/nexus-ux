import { directive } from '../directives'
import { mutateDom } from '../mutation'

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
