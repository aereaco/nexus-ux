import { directive } from '../directives'
import { initTree } from '../lifecycle'
import { mutateDom } from '../mutation'

directive('html', (el: any, { expression }: any, { effect, evaluateLater }: any) => {
    let evaluate = evaluateLater(expression)

    effect(() => {
        evaluate((value: any) => {
            mutateDom(() => {
                el.innerHTML = value

                el._data_ignoreSelf = true
                initTree(el)
                delete el._data_ignoreSelf
            })
        })
    })
})
