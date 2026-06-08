const fs = require('fs');
const { SourceMapConsumer } = require('source-map');

const rawSourceMap = fs.readFileSync('dist/assets/Index-DP7OcYWF.js.map', 'utf8');

SourceMapConsumer.with(rawSourceMap, null, consumer => {
  const pos = consumer.originalPositionFor({
    line: 13,
    column: 257517
  });

  console.log('Original position:', pos);
});
