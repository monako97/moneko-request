import neko from 'eslint-config-neko';

const conf = [...neko.configs.recommended, { ignores: ['lib'] }];

export default conf;
