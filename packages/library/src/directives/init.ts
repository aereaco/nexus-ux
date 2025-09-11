import { directive, prefix } from '../engine/directives';
import { addInitSelector } from '../engine/lifecycle';
import { skipDuringClone } from '../engine/clone';

addInitSelector(() => `[${prefix('init')}]`)

directive('init', skipDuringClone((el: any, { expression }: any, { evaluate }: any) => {
    if (typeof expression === 'string') {
        return !! expression.trim() && evaluate(expression, {}, false)
    }

    return evaluate(expression, {}, false)
}))
