import { parseAttribute } from './src/engine/attributeParser.ts';

const mockEl = { getAttribute: () => 'val' } as any;

const res1 = parseAttribute('data-on-click:morph:$(#results)', {} as any, mockEl);
console.log('Test 1:', res1);

const res2 = parseAttribute('data-on-click:morph.prevent:$(header > nav)', {} as any, mockEl);
console.log('Test 2:', res2);
