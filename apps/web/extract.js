const fs = require('fs');
const text = fs.readFileSync('error_output.html', 'utf8');
const match = text.match(/"message":"([^"]+)"/);
console.log(match ? match[1] : 'No message found');
