import base from '@moneko/eslint/base';

const conf = [...base.configs.recommended, { ignores: ['lib'] }];

export default conf;
