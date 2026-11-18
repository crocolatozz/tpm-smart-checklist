const express = require('express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(express.static(path.resolve(__dirname)));

app.listen(PORT, HOST, () => {
  console.log(`Chrome Extension MV3 Studio listening on http://${HOST}:${PORT}`);
});
