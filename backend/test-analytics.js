const http = require('http');

const data = JSON.stringify({ email: 'admin@queueflow.com', password: 'Admin@123' });

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/auth/staff/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const token = JSON.parse(body).data.token;
    
    http.get({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/admin/analytics',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res2) => {
      let b = '';
      res2.on('data', d => b += d);
      res2.on('end', () => require('fs').writeFileSync('analytics_res.json', b));
    });
  });
});
req.write(data);
req.end();
