import { RuntimeContext } from '../../engine/composition.ts';

export function refsSprite(runtime: RuntimeContext) {
  return runtime.refs;
}

export default function(runtime: RuntimeContext) {
  return {
    $refs: refsSprite(runtime)
  };
}
