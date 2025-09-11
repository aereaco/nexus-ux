import { skipDuringClone } from '../engine/clone'
import { directive } from '../engine/directives'
import { /*evaluate,*/ evaluateLater } from '../engine/evaluator'

directive('effect', skipDuringClone((el: any, { expression }: any, { effect }: any) => {
    effect(evaluateLater(el, expression))
}))
