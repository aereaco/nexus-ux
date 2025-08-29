import { skipDuringClone } from '../clone'
import { directive } from '../directives'
import { evaluate, evaluateLater } from '../evaluator'

directive('effect', skipDuringClone((el: any, { expression }: any, { effect }: any) => {
    effect(evaluateLater(el, expression))
}))
