const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const pluginCode = fs.readFileSync(path.join(__dirname, 'plugin.js'), 'utf8');
const splitAt = pluginCode.indexOf('var _entryModelModule');
const coreCode = pluginCode.slice(0, splitAt);
eval(coreCode);

function multiAssert(label, cases, fn) {
  for (const [input, expected] of cases) {
    it(`${label}(${JSON.stringify(input)}) === ${JSON.stringify(expected)}`, () => {
      assert.equal(fn(input), expected);
    });
  }
}

describe('isChinese', () => {
  it('returns true for Chinese characters', () => {
    assert.equal(isChinese('中'), true);
    assert.equal(isChinese('a'), false);
    assert.equal(isChinese('1'), false);
    assert.equal(isChinese(' '), false);
    assert.equal(isChinese('　'), false);
    assert.equal(isChinese('\n'), false);
  });
});

describe('hasChinese', () => {
  multiAssert('hasChinese', [
    ['hello中国world', true],
    ['hello world', false],
    ['', false],
    ['中文', true],
    ['abc123', false],
  ], hasChinese);
});

describe('textToPinyin', () => {
  multiAssert('textToPinyin', [
    ['百度', 'baidu'],
    ['微信', 'weixin'],
    ['支付宝', 'zhifubao'],
    ['中文', 'zhongwen'],
    ['hello', 'hello'],
    ['hello123', 'hello123'],
    ['', ''],
    ['百度baidu', 'baidubaidu'],
    ['QQ微信', 'QQweixin'],
  ], textToPinyin);
});

describe('textToPinyinFirstLetter', () => {
  multiAssert('textToPinyinFirstLetter', [
    ['百度', 'bd'],
    ['微信', 'wx'],
    ['支付宝', 'zfb'],
    ['中文', 'zw'],
    ['hello', ''],
    ['', ''],
    ['百度baidu', 'bd'],
    ['QQ微信', 'wx'],
  ], textToPinyinFirstLetter);
});

describe('charToPinyin map', () => {
  multiAssert('charToPinyin character exists', [
    ['百', true],
    ['度', true],
    ['微', true],
    ['信', true],
    ['支', true],
    ['付', true],
    ['宝', true],
    ['中', true],
  ], (ch) => Boolean(charToPinyin[ch]));

  multiAssert('charToPinyin first pinyin', [
    ['百', 'bai'],
    ['度', 'du'],
    ['信', 'xin'],
  ], (ch) => charToPinyin[ch][0]);
});
