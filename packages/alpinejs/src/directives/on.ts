import { directive, into, mapAttributes, prefix, startingWith } from '../directives'
import { evaluateLater } from '../evaluator'
import { skipDuringClone } from '../clone'
import on from '../utils/on'

mapAttributes(startingWith('@', into(prefix('on:'))))

directive('on', skipDuringClone((el: any, { value, modifiers, expression }: any, { cleanup }: any) => {
    let evaluate = expression ? evaluateLater(el, expression) : () => {}

    if (el.tagName.toLowerCase() === 'template') {
        if (! el._data_forwardEvents) el._data_forwardEvents = []
        if (! el._data_forwardEvents.includes(value)) el._data_forwardEvents.push(value)
    }

    let removeListener = on(el, value, modifiers, (e: any) => {
        evaluate(() => {}, { scope: { '$event': e }, params: [e] })
    })

    cleanup(() => removeListener())
}))
