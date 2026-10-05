import { AttributeModule } from '../../engine/modules.ts';
import { RuntimeContext } from '../../engine/composition.ts';
import { ParsedAttribute } from '../../engine/attributeParser.ts';

const styleModule: AttributeModule = {
  name: 'style',
  attribute: 'style',
  handle: (el: HTMLElement, value: string, runtime: RuntimeContext, parsedAttr?: ParsedAttribute): (() => void) | void => {
    const parsed = parsedAttr || runtime.parseAttribute('data-style', runtime, el);
    if (!parsed || parsed.argument) return;

    return runtime.bind(el, value, result => runtime.reconcileStyle(el, result));
  }
};

export default styleModule;
